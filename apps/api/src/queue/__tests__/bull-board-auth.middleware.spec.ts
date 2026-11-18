import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';

import { TokenType } from '@/auth/enum/token-type.enum';
import { passwordFingerprint } from '@/auth/password-fingerprint';
import type { PrismaService } from '@/prisma/prisma.service';

import { BullBoardAuthMiddleware } from '../bull-board-auth.middleware';

const SESSION = passwordFingerprint('secret', 'session', 'stored-hash');
const auth = { password: 'stored-hash' };

describe('BullBoardAuthMiddleware', () => {
   let jwt: { verifyAsync: jest.Mock };
   let prisma: { user: { findUnique: jest.Mock } };
   let middleware: BullBoardAuthMiddleware;

   const request = (authorization?: string) =>
      ({ headers: authorization ? { authorization } : {} }) as unknown as Request;
   const response = {} as Response;

   beforeEach(() => {
      jwt = { verifyAsync: jest.fn() };
      prisma = {
         user: {
            findUnique: jest.fn().mockResolvedValue({ id: 1, role: { isAdmin: true }, auth }),
         },
      };
      const config = { getOrThrow: jest.fn().mockReturnValue('secret') };

      middleware = new BullBoardAuthMiddleware(
         jwt as unknown as JwtService,
         config as unknown as ConfigService,
         prisma as unknown as PrismaService,
      );
   });

   it('lets an admin with an access token through', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1, type: TokenType.ACCESS, sh: SESSION });
      const next = jest.fn();

      await middleware.use(request('Bearer token'), response, next);

      expect(next).toHaveBeenCalledTimes(1);
   });

   it.each([
      ['password_reset', TokenType.PASSWORD_RESET],
      ['invitation', TokenType.INVITATION],
      ['refresh', TokenType.REFRESH],
   ])('rejects a %s token before loading the user', async (_label, type) => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1, type });
      const next = jest.fn();

      await expect(middleware.use(request('Bearer token'), response, next)).rejects.toBeInstanceOf(
         UnauthorizedException,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
   });

   it('forbids a non-admin with a valid access token', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 2, type: TokenType.ACCESS, sh: SESSION });
      prisma.user.findUnique.mockResolvedValue({ id: 2, role: { isAdmin: false }, auth });
      const next = jest.fn();

      await expect(middleware.use(request('Bearer token'), response, next)).rejects.toBeInstanceOf(
         ForbiddenException,
      );
      expect(next).not.toHaveBeenCalled();
   });

   it('rejects an admin token issued for a previous password', async () => {
      jwt.verifyAsync.mockResolvedValue({
         sub: 1,
         type: TokenType.ACCESS,
         sh: passwordFingerprint('secret', 'session', 'old-hash'),
      });
      const next = jest.fn();

      await expect(middleware.use(request('Bearer token'), response, next)).rejects.toBeInstanceOf(
         UnauthorizedException,
      );
      expect(next).not.toHaveBeenCalled();
   });

   it('answers a database outage as an error of the server, not as 401', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1, type: TokenType.ACCESS, sh: SESSION });
      const outage = new Error('Connection terminated unexpectedly');
      prisma.user.findUnique.mockRejectedValue(outage);
      const next = jest.fn();

      await expect(middleware.use(request('Bearer token'), response, next)).rejects.toBe(outage);
      expect(next).not.toHaveBeenCalled();
   });
});
