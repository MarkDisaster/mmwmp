import {
   BadRequestException,
   ConflictException,
   Injectable,
   NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { TokenType } from '@/auth/enum/token-type.enum';
import { hashPassword } from '@/auth/password';
import { revokeAllSessions } from '@/auth/session-revocation';
import { normalizeEmail } from '@/common/decorators/normalize-email.decorator';
import { EmailQueue } from '@/email/email.queue';
import type { EmailMessage } from '@/email/email.types';
import { PrismaService } from '@/prisma/prisma.service';
import { withSaveErrors } from '@/prisma/save-error.helper';
import { INTERACTIVE_TRANSACTION_OPTIONS } from '@/prisma/transaction.helper';
import {
   assertCanManageUser,
   findAssignableRole,
   findPrivilegeActor,
   USER_SAVE_ERRORS,
} from '@/role/role-privilege';

import type { AcceptInvitationDto } from './dto/accept-invitation.dto';

const INVITATION_EXPIRATION = '7d';

const INVALID_INVITATION = 'Invalid or expired invitation';

type InvitationPayload = {
   sub: number;
   type: string;
   iat?: number;
};

const isCurrentInvitation = (payload: InvitationPayload, invitedAt: Date | null): boolean =>
   invitedAt !== null &&
   payload.iat !== undefined &&
   payload.iat >= Math.floor(invitedAt.getTime() / 1000);

@Injectable()
export class UserInvitationService {
   constructor(
      private prisma: PrismaService,
      private jwtService: JwtService,
      private emailQueue: EmailQueue,
      private config: ConfigService,
   ) {}

   async invite(rawEmail: string, roleId: number, actorId: number) {
      const email = normalizeEmail(rawEmail);
      const invitedAt = new Date();
      const user = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const existing = await tx.user.findUnique({ where: { email } });
               if (existing && !existing.deletedAt) {
                  throw new ConflictException('User with this email already exists');
               }

               const actor = await findPrivilegeActor(tx, actorId);
               await findAssignableRole(tx, actor, roleId, 'Cannot invite user with admin role');

               const invitation = { roleId, invitedAt, acceptedInvitationAt: null };
               if (!existing) {
                  return tx.user.create({
                     data: { ...invitation, email, firstName: '', lastName: '' },
                  });
               }
               await tx.auth.deleteMany({ where: { userId: existing.id } });
               await revokeAllSessions(tx, existing.id);
               return tx.user.update({
                  where: { id: existing.id },
                  data: {
                     ...invitation,
                     firstName: '',
                     lastName: '',
                     deletedAt: null,
                     deactivatedAt: null,
                     deactivatedById: null,
                  },
               });
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         USER_SAVE_ERRORS,
      );

      await this.queueInvitation(user.id, invitedAt);
      return { id: user.id, email: user.email };
   }

   async verify(token: string) {
      await this.findInvitedUser(await this.verifyToken(token));
      return { valid: true };
   }

   async accept(token: string, dto: AcceptInvitationDto) {
      const user = await this.findInvitedUser(await this.verifyToken(token));
      const hashedPassword = await hashPassword(dto.password);

      await this.prisma.$transaction(async (tx) => {
         const { count } = await tx.user.updateMany({
            where: {
               id: user.id,
               deletedAt: null,
               deactivatedAt: null,
               acceptedInvitationAt: null,
            },
            data: {
               firstName: dto.firstName,
               lastName: dto.lastName,
               acceptedInvitationAt: new Date(),
            },
         });
         if (count === 0) throw new BadRequestException(INVALID_INVITATION);

         await tx.auth.upsert({
            where: { userId: user.id },
            update: { password: hashedPassword },
            create: { userId: user.id, password: hashedPassword },
         });
      });

      return { message: 'Invitation accepted' };
   }

   async resend(userId: number, actorId: number) {
      const user = await this.prisma.user.findFirst({
         where: { id: userId, deletedAt: null, deactivatedAt: null, acceptedInvitationAt: null },
         include: { role: { include: { permissions: true } } },
      });

      if (!user) {
         throw new NotFoundException('Pending user not found');
      }
      assertCanManageUser(await findPrivilegeActor(this.prisma, actorId), user);

      const invitedAt = new Date();
      await this.prisma.user.update({ where: { id: userId }, data: { invitedAt } });

      await this.queueInvitation(userId, invitedAt);
      return { id: user.id, email: user.email };
   }

   private async findInvitedUser(payload: InvitationPayload) {
      const user = await this.prisma.user.findFirst({
         where: {
            id: payload.sub,
            deletedAt: null,
            deactivatedAt: null,
            acceptedInvitationAt: null,
         },
      });

      if (!user || !isCurrentInvitation(payload, user.invitedAt)) {
         throw new BadRequestException(INVALID_INVITATION);
      }
      return user;
   }

   async createInvitationEmail(userId: number, invitedAt: string): Promise<EmailMessage | null> {
      const user = await this.prisma.user.findFirst({
         where: {
            id: userId,
            deletedAt: null,
            acceptedInvitationAt: null,
            deactivatedAt: null,
            invitedAt: new Date(invitedAt),
         },
      });
      if (!user) return null;

      const token = await this.jwtService.signAsync(
         { sub: user.id, type: TokenType.INVITATION } as Record<string, unknown>,
         { expiresIn: INVITATION_EXPIRATION },
      );

      const adminUrl = this.config.getOrThrow<string>('auth.adminUrl');
      const inviteUrl = `${adminUrl}/invitation/${token}`;

      return {
         to: user.email,
         subject: 'You have been invited',
         body: `You have been invited to marek.media admin. Click here to accept: ${inviteUrl}\n\nThis link expires in 7 days.`,
      };
   }

   private async queueInvitation(userId: number, invitedAt: Date) {
      const message = await this.createInvitationEmail(userId, invitedAt.toISOString());
      if (message) await this.emailQueue.send(message);
   }

   private async verifyToken(token: string): Promise<InvitationPayload> {
      try {
         const payload = await this.jwtService.verifyAsync<InvitationPayload>(token);

         if (payload.type !== TokenType.INVITATION) {
            throw new BadRequestException('Invalid token type');
         }

         return payload;
      } catch (error) {
         if (error instanceof BadRequestException) {
            throw error;
         }
         throw new BadRequestException(INVALID_INVITATION);
      }
   }
}
