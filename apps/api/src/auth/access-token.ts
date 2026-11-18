import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { AuthenticatedUser } from '@/common/guards/auth.guard';
import type { PrismaService } from '@/prisma/prisma.service';

import { TokenType } from './enum/token-type.enum';
import { matchesFingerprint, passwordFingerprint } from './password-fingerprint';
import { isIssuedBeforeValidAfter } from './session-revocation';

type AccessTokenPayload = { sub: number; type?: string; sh?: unknown; iat?: number };

export type AccessTokenVerifierDeps = {
   jwtService: JwtService;
   prisma: PrismaService;
   secret: string;
};

const BEARER_CREDENTIALS = /^bearer +(\S+)$/i;

export const extractBearerToken = (request: Pick<Request, 'headers'>): string | undefined =>
   BEARER_CREDENTIALS.exec(request.headers.authorization ?? '')?.[1];

export const verifyAccessToken = async (
   token: string | undefined,
   { jwtService, prisma, secret }: AccessTokenVerifierDeps,
): Promise<AuthenticatedUser> => {
   if (!token) throw new UnauthorizedException();

   let payload: AccessTokenPayload;
   try {
      payload = await jwtService.verifyAsync<AccessTokenPayload>(token, { secret });
   } catch {
      throw new UnauthorizedException();
   }

   if (payload.type !== TokenType.ACCESS) throw new UnauthorizedException();

   const found = await prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null, deactivatedAt: null },
      include: {
         role: { include: { permissions: true } },
         auth: { select: { password: true } },
      },
   });

   if (
      !found?.auth ||
      !matchesFingerprint(payload.sh, passwordFingerprint(secret, 'session', found.auth.password))
   ) {
      throw new UnauthorizedException();
   }
   if (isIssuedBeforeValidAfter(payload.iat, found.sessionsValidAfter)) {
      throw new UnauthorizedException();
   }
   const { auth: _auth, ...user } = found;
   return user;
};
