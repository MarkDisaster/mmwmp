import {
   BadRequestException,
   HttpException,
   HttpStatus,
   Injectable,
   Logger,
   ServiceUnavailableException,
   UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';

import { normalizeEmail } from '@/common/decorators/normalize-email.decorator';
import { EmailQueue } from '@/email/email.queue';
import type { EmailMessage } from '@/email/email.types';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { RateLimitResult } from '@/rate-limit/rate-limit.service';
import { RateLimitService } from '@/rate-limit/rate-limit.service';

import type { AuthLoginDto } from './dto/auth-login.dto';
import { TokenType } from './enum/token-type.enum';
import { hashPassword, verifyPassword } from './password';
import { matchesFingerprint, passwordFingerprint } from './password-fingerprint';
import { revokeAllSessions } from './session-revocation';

const PASSWORD_RESET_EXPIRATION = 900;

const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const LOGIN_ACCOUNT_FAILURE_LIMIT = 30;
const LOGIN_ACCOUNT_FAILURE_WINDOW_SECONDS = 60 * 60;
const FORGOT_PASSWORD_ADDRESS_RATE_LIMIT = 10;
const FORGOT_PASSWORD_EMAIL_RATE_LIMIT = 3;
const FORGOT_PASSWORD_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

const INVALID_RESET_TOKEN = 'Invalid or expired token';
const INVALID_REFRESH_TOKEN = 'Invalid refresh token';

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type PasswordResetPayload = { sub: number; type: string; pwd?: string };

type RefreshSession = { familyId: string; startedAt: Date };

const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex');

const assertCounted = (limit: RateLimitResult) => {
   if (limit.unavailable) throw new ServiceUnavailableException('Please try again later.');
};

const assertWithinLimit = (limit: RateLimitResult, message: string) => {
   assertCounted(limit);
   if (limit.allowed) return;
   throw new HttpException(
      {
         statusCode: HttpStatus.TOO_MANY_REQUESTS,
         message: `${message}. Please try again later.`,
         retryAfterSeconds: limit.retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
   );
};

@Injectable()
export class AuthService {
   private readonly logger = new Logger(AuthService.name);

   constructor(
      private prisma: PrismaService,
      private jwtService: JwtService,
      private config: ConfigService,
      private emailQueue: EmailQueue,
      private rateLimit: RateLimitService,
   ) {}

   private readonly dummyHash = hashPassword(randomUUID());

   async signIn(dto: AuthLoginDto, ipAddress: string) {
      const email = normalizeEmail(dto.email);
      const addressKey = `auth:login:${ipAddress}|${email}`;
      const accountKey = `auth:login:account:${email}`;
      assertWithinLimit(
         await this.rateLimit.hit(addressKey, LOGIN_RATE_LIMIT, LOGIN_RATE_LIMIT_WINDOW_SECONDS, {
            failClosed: true,
         }),
         'Too many login attempts',
      );
      assertWithinLimit(
         await this.rateLimit.peek(accountKey, LOGIN_ACCOUNT_FAILURE_LIMIT, { failClosed: true }),
         'Too many login attempts',
      );

      const user = await this.prisma.user.findUnique({
         where: { email, deletedAt: null },
         include: { auth: true },
      });

      if (!user?.auth || user.deactivatedAt !== null) {
         await verifyPassword(dto.password, await this.dummyHash);
         await this.countFailedLogin(accountKey);
         throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await verifyPassword(dto.password, user.auth.password);

      if (!isPasswordValid) {
         await this.countFailedLogin(accountKey);
         throw new UnauthorizedException('Invalid credentials');
      }

      await this.rateLimit.reset(addressKey, accountKey);

      return this.generateTokens(user.id, user.email, user.auth.password, {
         familyId: randomUUID(),
         startedAt: new Date(),
      });
   }

   async refreshTokens(refreshToken: string) {
      const stored = await this.prisma.refreshToken.findUnique({
         where: { tokenHash: hashRefreshToken(refreshToken) },
         include: { user: { include: { auth: true } } },
      });
      if (!stored?.familyId || !stored.sessionStartedAt) {
         throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
      }
      const session: RefreshSession = {
         familyId: stored.familyId,
         startedAt: stored.sessionStartedAt,
      };

      if (stored.rotatedAt) return this.rejectReuse(stored.userId, session.familyId);

      if (
         stored.isRevoked ||
         stored.expiresAt < new Date() ||
         stored.user.deletedAt !== null ||
         stored.user.deactivatedAt !== null ||
         !stored.user.auth
      ) {
         throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
      }

      try {
         await this.jwtService.verifyAsync(refreshToken, {
            secret: this.config.getOrThrow<string>('auth.jwtRefreshSecret'),
         });
      } catch {
         throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
      }

      const tokens = await this.prisma.$transaction(async (tx) => {
         const [auth] = await tx.$queryRaw<{ password: string }[]>(
            Prisma.sql`SELECT password FROM auth WHERE user_id = ${stored.userId} FOR SHARE`,
         );
         const [user] = await tx.$queryRaw<{ email: string }[]>(
            Prisma.sql`SELECT email FROM users WHERE id = ${stored.userId} AND deleted_at IS NULL AND deactivated_at IS NULL FOR SHARE`,
         );
         if (!auth || !user) throw new UnauthorizedException(INVALID_REFRESH_TOKEN);

         const { count } = await tx.refreshToken.updateMany({
            where: { id: stored.id, isRevoked: false, expiresAt: { gt: new Date() } },
            data: { isRevoked: true, rotatedAt: new Date() },
         });
         if (count === 0) {
            const current = await tx.refreshToken.findUnique({
               where: { id: stored.id },
               select: { rotatedAt: true },
            });
            return current?.rotatedAt ? 'reused' : 'invalid';
         }

         return this.generateTokens(stored.userId, user.email, auth.password, session, tx);
      });

      if (tokens === 'reused') return this.rejectReuse(stored.userId, session.familyId);
      if (tokens === 'invalid') throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
      return tokens;
   }

   async forgotPassword(email: string, ipAddress: string) {
      assertWithinLimit(
         await this.rateLimit.hit(
            `auth:forgot-password:${ipAddress}`,
            FORGOT_PASSWORD_ADDRESS_RATE_LIMIT,
            FORGOT_PASSWORD_RATE_LIMIT_WINDOW_SECONDS,
            { failClosed: true },
         ),
         'Too many password reset requests',
      );
      const perEmail = await this.rateLimit.hit(
         `auth:forgot-password:email:${normalizeEmail(email)}`,
         FORGOT_PASSWORD_EMAIL_RATE_LIMIT,
         FORGOT_PASSWORD_RATE_LIMIT_WINDOW_SECONDS,
         { failClosed: true },
      );
      assertCounted(perEmail);
      if (!perEmail.allowed) return;

      const user = await this.prisma.user.findUnique({
         where: { email: normalizeEmail(email), deletedAt: null },
         include: { auth: true },
      });

      if (!user?.auth || user.deactivatedAt !== null) return;

      this.createPasswordResetEmail(user.id)
         .then((message) => message && this.emailQueue.send(message))
         .catch((error: unknown) =>
            this.logger.error(
               `Password reset email for user ${user.id} could not be queued`,
               error instanceof Error ? error.stack : String(error),
            ),
         );
   }

   async createPasswordResetEmail(userId: number): Promise<EmailMessage | null> {
      const user = await this.prisma.user.findUnique({
         where: { id: userId, deletedAt: null },
         include: { auth: true },
      });
      if (!user?.auth || user.deactivatedAt !== null) return null;

      const token = await this.jwtService.signAsync(
         {
            sub: user.id,
            type: TokenType.PASSWORD_RESET,
            pwd: passwordFingerprint(this.jwtSecret(), 'password-reset', user.auth.password),
         } as Record<string, unknown>,
         { expiresIn: PASSWORD_RESET_EXPIRATION },
      );

      const adminUrl = this.config.getOrThrow<string>('auth.adminUrl');
      const resetUrl = `${adminUrl}/reset-password/${token}`;

      return {
         to: user.email,
         subject: 'Password Reset',
         body: `Click here to reset your password: ${resetUrl}\n\nThis link expires in ${PASSWORD_RESET_EXPIRATION / 60} minutes.`,
      };
   }

   async resetPassword(token: string, newPassword: string) {
      let payload: PasswordResetPayload;

      try {
         payload = await this.jwtService.verifyAsync<PasswordResetPayload>(token);
      } catch {
         throw new BadRequestException(INVALID_RESET_TOKEN);
      }

      if (payload.type !== TokenType.PASSWORD_RESET) {
         throw new BadRequestException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
         where: { id: payload.sub, deletedAt: null },
         include: { auth: true },
      });

      if (
         !user?.auth ||
         user.deactivatedAt !== null ||
         !matchesFingerprint(
            payload.pwd,
            passwordFingerprint(this.jwtSecret(), 'password-reset', user.auth.password),
         )
      ) {
         throw new BadRequestException(INVALID_RESET_TOKEN);
      }

      const hashedPassword = await hashPassword(newPassword);
      const previousHash = user.auth.password;

      await this.prisma.$transaction(async (tx) => {
         const { count } = await tx.auth.updateMany({
            where: { userId: user.id, password: previousHash },
            data: { password: hashedPassword },
         });
         if (count === 0) throw new BadRequestException(INVALID_RESET_TOKEN);
         await revokeAllSessions(tx, user.id);
      });
   }

   async logout(refreshToken: string) {
      const stored = await this.prisma.refreshToken.findUnique({
         where: { tokenHash: hashRefreshToken(refreshToken) },
         select: { userId: true, familyId: true },
      });
      if (stored?.familyId) await this.revokeFamily(stored.userId, stored.familyId);
   }

   private async rejectReuse(userId: number, familyId: string): Promise<never> {
      await this.revokeFamily(userId, familyId);
      this.logger.warn(`Refresh token reused for user ${userId}; the session is revoked`);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
   }

   private async revokeFamily(userId: number, familyId: string) {
      await this.prisma.$transaction(async (tx) => {
         await tx.$executeRaw`SELECT 1 FROM auth WHERE user_id = ${userId} FOR NO KEY UPDATE`;
         await tx.refreshToken.updateMany({
            where: { familyId, isRevoked: false },
            data: { isRevoked: true },
         });
      });
   }

   private jwtSecret(): string {
      return this.config.getOrThrow<string>('auth.jwtSecret');
   }

   private async countFailedLogin(accountKey: string) {
      await this.rateLimit.hit(
         accountKey,
         LOGIN_ACCOUNT_FAILURE_LIMIT,
         LOGIN_ACCOUNT_FAILURE_WINDOW_SECONDS,
      );
   }

   private async generateTokens(
      userId: number,
      email: string,
      passwordHash: string,
      session: RefreshSession,
      client: PrismaService | Prisma.TransactionClient = this.prisma,
   ) {
      const sessionLeft = Math.floor(
         (session.startedAt.getTime() + SESSION_MAX_AGE_SECONDS * 1000 - Date.now()) / 1000,
      );
      if (sessionLeft < 1) throw new UnauthorizedException(INVALID_REFRESH_TOKEN);

      const jti = randomUUID();
      const accessPayload = {
         sub: userId,
         email,
         type: TokenType.ACCESS,
         jti,
         sh: passwordFingerprint(this.jwtSecret(), 'session', passwordHash),
      };
      const refreshPayload = { sub: userId, email, type: TokenType.REFRESH, jti };

      const expiresIn = Math.min(this.config.getOrThrow<number>('auth.jwtExpiration'), sessionLeft);
      const refreshExpiresIn = Math.min(
         this.config.getOrThrow<number>('auth.jwtRefreshExpiration'),
         sessionLeft,
      );
      const [accessToken, refreshToken] = await Promise.all([
         this.jwtService.signAsync(accessPayload as Record<string, unknown>, { expiresIn }),
         this.jwtService.signAsync(refreshPayload as Record<string, unknown>, {
            secret: this.config.getOrThrow<string>('auth.jwtRefreshSecret'),
            expiresIn: refreshExpiresIn,
         }),
      ]);

      await client.refreshToken.create({
         data: {
            tokenHash: hashRefreshToken(refreshToken),
            familyId: session.familyId,
            sessionStartedAt: session.startedAt,
            userId,
            expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
         },
      });

      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      return { accessToken, refreshToken, expiresAt };
   }
}
