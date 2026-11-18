import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';

import { TokenType } from '@/auth/enum/token-type.enum';
import { passwordFingerprint } from '@/auth/password-fingerprint';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import type { PrismaService } from '@/prisma/prisma.service';

import { AuthGuard, hasPermission } from '../auth.guard';

const SESSION = passwordFingerprint('secret', 'session', 'stored-hash');
const auth = { password: 'stored-hash' };

describe('AuthGuard', () => {
   let jwt: { verifyAsync: jest.Mock };
   let prisma: { user: { findUnique: jest.Mock } };
   let reflector: { getAllAndOverride: jest.Mock };
   let guard: AuthGuard;

   const adminUser = { id: 1, deletedAt: null, role: { isAdmin: true, permissions: [] } };
   const storedAdmin = { ...adminUser, auth };

   const contextFor = (authorization?: string) => {
      const request: { headers: Record<string, string>; user?: unknown } = {
         headers: authorization ? { authorization } : {},
      };
      const context = {
         switchToHttp: () => ({ getRequest: () => request }),
         getHandler: () => undefined,
         getClass: () => undefined,
      } as unknown as ExecutionContext;
      return { context, request };
   };

   beforeEach(() => {
      jwt = { verifyAsync: jest.fn() };
      prisma = { user: { findUnique: jest.fn().mockResolvedValue(storedAdmin) } };
      reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
      const config = { getOrThrow: jest.fn().mockReturnValue('secret') };

      guard = new AuthGuard(
         jwt as unknown as JwtService,
         config as unknown as ConfigService,
         prisma as unknown as PrismaService,
         reflector as unknown as Reflector,
      );
   });

   it('accepts an access token and attaches the user to the request', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1, type: TokenType.ACCESS, sh: SESSION });
      const { context, request } = contextFor('Bearer token');

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toEqual(adminUser);
   });

   it('looks the user up on every request without deleted and deactivated accounts', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1, type: TokenType.ACCESS, sh: SESSION });
      prisma.user.findUnique.mockResolvedValue(null);
      const { context } = contextFor('Bearer token');

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
         expect.objectContaining({ where: { id: 1, deletedAt: null, deactivatedAt: null } }),
      );
   });

   it('refuses a token issued before the sessions of the user were voided', async () => {
      const validAfter = new Date('2026-11-09T10:00:00.000Z');
      const iat = Math.floor(validAfter.getTime() / 1000);
      prisma.user.findUnique.mockResolvedValue({ ...storedAdmin, sessionsValidAfter: validAfter });
      const { context } = contextFor('Bearer token');

      jwt.verifyAsync.mockResolvedValue({ sub: 1, type: TokenType.ACCESS, sh: SESSION, iat });
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);

      jwt.verifyAsync.mockResolvedValue({
         sub: 1,
         type: TokenType.ACCESS,
         sh: SESSION,
         iat: iat + 1,
      });
      await expect(guard.canActivate(context)).resolves.toBe(true);
   });

   it.each([
      ['password_reset', TokenType.PASSWORD_RESET],
      ['invitation', TokenType.INVITATION],
      ['refresh', TokenType.REFRESH],
   ])('rejects a %s token before loading the user', async (_label, type) => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1, type });
      const { context } = contextFor('Bearer token');

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
   });

   it('rejects a token without a type claim', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1 });
      const { context } = contextFor('Bearer token');

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
   });

   it('rejects a request without a Bearer header', async () => {
      const { context } = contextFor();

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwt.verifyAsync).not.toHaveBeenCalled();
   });

   it('rejects a non-admin without the required permission', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 2, type: TokenType.ACCESS, sh: SESSION });
      prisma.user.findUnique.mockResolvedValue({
         id: 2,
         role: { isAdmin: false, permissions: [{ resource: 'projects', action: 'read' }] },
         auth,
      });
      reflector.getAllAndOverride.mockReturnValue({
         resource: PermissionResource.projects,
         action: PermissionAction.delete,
      });
      const { context } = contextFor('Bearer token');

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
   });
});

describe('AuthGuard — password change and outages', () => {
   let jwt: { verifyAsync: jest.Mock };
   let prisma: { user: { findUnique: jest.Mock } };
   let guard: AuthGuard;
   let request: { headers: Record<string, string>; user?: object };

   const context = () =>
      ({
         switchToHttp: () => ({ getRequest: () => request }),
         getHandler: () => undefined,
         getClass: () => undefined,
      }) as unknown as ExecutionContext;

   beforeEach(() => {
      request = { headers: { authorization: 'Bearer t' } };
      jwt = { verifyAsync: jest.fn() };
      prisma = {
         user: {
            findUnique: jest
               .fn()
               .mockResolvedValue({ id: 1, role: { isAdmin: true, permissions: [] }, auth }),
         },
      };
      guard = new AuthGuard(
         jwt as unknown as JwtService,
         { getOrThrow: jest.fn().mockReturnValue('secret') } as unknown as ConfigService,
         prisma as unknown as PrismaService,
         { getAllAndOverride: jest.fn() } as unknown as Reflector,
      );
   });

   it('rejects an access token issued for a previous password', async () => {
      jwt.verifyAsync.mockResolvedValue({
         sub: 1,
         type: TokenType.ACCESS,
         sh: passwordFingerprint('secret', 'session', 'previous-hash'),
      });

      await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
   });

   it.each([
      ['without the session fingerprint', undefined],
      [
         'with a reset fingerprint instead',
         passwordFingerprint('secret', 'password-reset', 'stored-hash'),
      ],
   ])('rejects an access token %s', async (_case, sh) => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1, type: TokenType.ACCESS, sh });

      await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
   });

   it('rejects a user without a password (a pending invitation)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1, type: TokenType.ACCESS, sh: SESSION });
      prisma.user.findUnique.mockResolvedValue({
         id: 1,
         role: { isAdmin: true, permissions: [] },
         auth: null,
      });

      await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
   });

   it('does not hand the password hash on with the user', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1, type: TokenType.ACCESS, sh: SESSION });

      await guard.canActivate(context());
      expect(request.user).toBeDefined();
      expect(request.user).not.toHaveProperty('auth');
   });

   it('answers a database outage as an error of the server, not as 401 (no sign-out)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 1, type: TokenType.ACCESS, sh: SESSION });
      const outage = new Error('Connection terminated unexpectedly');
      prisma.user.findUnique.mockRejectedValue(outage);

      await expect(guard.canActivate(context())).rejects.toBe(outage);
   });

   it('still answers an invalid token with 401', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));

      await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
   });
});

describe('hasPermission', () => {
   const editorRole = {
      isAdmin: false,
      permissions: [{ resource: PermissionResource.services, action: PermissionAction.update }],
   };
   const need = (resource: PermissionResource, action: PermissionAction) => ({ resource, action });

   it('grants every permission to the admin role', () => {
      const adminRole = { isAdmin: true, permissions: [] };
      expect(
         hasPermission(adminRole, need(PermissionResource.services, PermissionAction.publish)),
      ).toBe(true);
   });

   it('grants a permission the role has', () => {
      expect(
         hasPermission(editorRole, need(PermissionResource.services, PermissionAction.update)),
      ).toBe(true);
   });

   it('refuses a permission the role does not have', () => {
      expect(
         hasPermission(editorRole, need(PermissionResource.services, PermissionAction.publish)),
      ).toBe(false);
      expect(
         hasPermission(editorRole, need(PermissionResource.projects, PermissionAction.update)),
      ).toBe(false);
   });
});
