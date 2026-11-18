import { JwtService } from '@nestjs/jwt';

import { TokenType } from '../../../src/auth/enum/token-type.enum';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { captureEmails } from '../../setup/emails';
import { getApp, getHttpServer } from '../../setup/init';
import { holdLock, startRequest, waitForLockWait } from '../../setup/locks';
import {
   createAdminAndLogin,
   createTestUser,
   getRoleId,
   loginAs,
   TEST_PASSWORD,
} from '../../setup/users';

type Tokens = { accessToken: string; refreshToken: string };

describe('User deactivation (e2e)', () => {
   let prisma: PrismaService;
   let queued: jest.SpyInstance;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.project.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { isSystem: false } });
   };

   beforeEach(async () => {
      await cleanupDb();
      queued = captureEmails();
   });
   afterEach(() => jest.restoreAllMocks());
   afterAll(cleanupDb);

   const login = async (email: string, password = TEST_PASSWORD) =>
      getHttpServer().post('/auth/login').send({ email, password });

   const session = async (email: string): Promise<Tokens> => {
      const response = await login(email);
      expect(response.status).toBe(201);
      return response.body;
   };

   const refresh = (refreshToken: string) =>
      getHttpServer().post('/auth/refresh').send({ refreshToken });

   const me = (accessToken: string) =>
      getHttpServer().get('/users/me').set('Authorization', `Bearer ${accessToken}`);

   const act = (token: string, action: 'deactivate' | 'reactivate', id: number) =>
      getHttpServer().patch(`/users/${id}/${action}`).set('Authorization', `Bearer ${token}`);

   const waitForAudit = () => new Promise((resolve) => setTimeout(resolve, 200));

   describe('PATCH /users/:id/deactivate', () => {
      it('should cut off an access token and a refresh token the user already holds', async () => {
         const adminToken = await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         const tokens = await session('user@test.com');
         expect((await me(tokens.accessToken)).status).toBe(200);

         const response = await act(adminToken, 'deactivate', user.id);

         expect(response.status).toBe(200);
         expect(response.body.deactivatedAt).not.toBeNull();
         expect((await me(tokens.accessToken)).status).toBe(401);
         expect((await refresh(tokens.refreshToken)).status).toBe(401);
         expect(
            await prisma.refreshToken.count({ where: { userId: user.id, isRevoked: false } }),
         ).toBe(0);
         const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
         expect(stored.deactivatedById).not.toBeNull();
      });

      it('should refuse a login with the same answer as for wrong credentials', async () => {
         const adminToken = await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         await act(adminToken, 'deactivate', user.id);

         const deactivated = await login('user@test.com');
         const wrongPassword = await login('admin@test.com', 'wrong-password');
         const unknown = await login('nobody@test.com');

         expect(deactivated.status).toBe(401);
         expect(deactivated.body).toEqual(wrongPassword.body);
         expect(deactivated.body).toEqual(unknown.body);
      });

      it('should write the audit entry and keep the audit log and authorship of the user', async () => {
         const adminToken = await createAdminAndLogin();
         const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         await prisma.auditLog.create({
            data: { userId: user.id, actorType: 'user', action: 'tag.create', resourceType: 'tag' },
         });

         await act(adminToken, 'deactivate', user.id);
         await waitForAudit();

         const entry = await prisma.auditLog.findFirstOrThrow({
            where: { action: 'user.deactivate' },
         });
         expect(entry).toMatchObject({ userId: admin.id, resourceType: 'user' });
         expect(entry.resourceId).toBe(String(user.id));
         expect(await prisma.auditLog.count({ where: { userId: user.id } })).toBe(1);
      });

      it('should answer 409 for a user that is deactivated already', async () => {
         const adminToken = await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         await act(adminToken, 'deactivate', user.id);

         const response = await act(adminToken, 'deactivate', user.id);

         expect(response.status).toBe(409);
      });

      it('should answer 404 for an unknown user', async () => {
         const adminToken = await createAdminAndLogin();

         expect((await act(adminToken, 'deactivate', 999_999)).status).toBe(404);
      });

      it('should refuse the own account and the admin user, so the last admin stays active', async () => {
         const adminToken = await createAdminAndLogin();
         const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
         const managerRole = await prisma.role.create({
            data: {
               name: 'manager',
               permissions: { create: [{ resource: 'users', action: 'update' }] },
            },
         });
         await createTestUser({ email: 'manager@test.com', role: managerRole.name });
         const managerToken = await loginAs('manager@test.com');
         const manager = await prisma.user.findUniqueOrThrow({
            where: { email: 'manager@test.com' },
         });

         const self = await act(adminToken, 'deactivate', admin.id);
         const selfManager = await act(managerToken, 'deactivate', manager.id);
         const adminByManager = await act(managerToken, 'deactivate', admin.id);

         expect(self.status).toBe(400);
         expect(selfManager.status).toBe(403);
         expect(adminByManager.status).toBe(400);
         const stored = await prisma.user.findMany({ where: { deactivatedAt: { not: null } } });
         expect(stored).toHaveLength(0);
      });

      it('should refuse a user whose role holds permissions the caller does not', async () => {
         await createAdminAndLogin();
         const managerRole = await prisma.role.create({
            data: {
               name: 'manager',
               permissions: { create: [{ resource: 'users', action: 'update' }] },
            },
         });
         await prisma.role.create({
            data: {
               name: 'higher',
               permissions: {
                  create: [
                     { resource: 'users', action: 'update' },
                     { resource: 'roles', action: 'update' },
                  ],
               },
            },
         });
         await createTestUser({ email: 'manager@test.com', role: managerRole.name });
         const higher = await createTestUser({ email: 'higher@test.com', role: 'higher' });
         const managerToken = await loginAs('manager@test.com');

         const response = await act(managerToken, 'deactivate', higher.id);

         expect(response.status).toBe(403);
         expect(
            (await prisma.user.findUniqueOrThrow({ where: { id: higher.id } })).deactivatedAt,
         ).toBeNull();
      });

      it('should refuse a caller without users.update', async () => {
         await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         await createTestUser({ email: 'other@test.com', role: 'editor' });
         const editorToken = await loginAs('other@test.com');

         expect((await act(editorToken, 'deactivate', user.id)).status).toBe(403);
      });
   });

   describe('PATCH /users/:id/reactivate', () => {
      it('should restore the login with the old credentials, void every older token, and audit it', async () => {
         const adminToken = await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         const old = await session('user@test.com');
         await act(adminToken, 'deactivate', user.id);

         const response = await act(adminToken, 'reactivate', user.id);

         expect(response.status).toBe(200);
         expect(response.body.deactivatedAt).toBeNull();
         expect((await me(old.accessToken)).status).toBe(401);
         expect((await refresh(old.refreshToken)).status).toBe(401);
         await new Promise((resolve) => setTimeout(resolve, 1100));
         const fresh = await session('user@test.com');
         expect((await me(fresh.accessToken)).status).toBe(200);
         await waitForAudit();
         expect(await prisma.auditLog.count({ where: { action: 'user.reactivate' } })).toBe(1);
      });

      it('should answer 409 for an active user', async () => {
         const adminToken = await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });

         expect((await act(adminToken, 'reactivate', user.id)).status).toBe(409);
      });
   });

   describe('password reset', () => {
      it('should neither send a link to a deactivated user nor reactivate through a link', async () => {
         const adminToken = await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         const link = await getApp()
            .get(JwtService)
            .signAsync({ sub: user.id, type: TokenType.PASSWORD_RESET });
         await act(adminToken, 'deactivate', user.id);

         const forgot = await getHttpServer()
            .post('/auth/forgot-password')
            .send({ email: 'user@test.com' });
         await new Promise((resolve) => setImmediate(resolve));
         const reset = await getHttpServer()
            .post('/auth/reset-password')
            .send({ token: link, newPassword: 'new-password-123' });

         expect(forgot.status).toBe(200);
         expect(queued).not.toHaveBeenCalled();
         expect(reset.status).toBe(400);
         expect((await login('user@test.com', 'new-password-123')).status).toBe(401);
         expect(
            (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).deactivatedAt,
         ).not.toBeNull();
      });
   });

   describe('invitation', () => {
      it('should not accept the invitation of a deactivated user until reactivation', async () => {
         const adminToken = await createAdminAndLogin();
         const editorRoleId = await getRoleId('editor');
         const invited = await getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'new@test.com', roleId: editorRoleId });
         const token = await getApp()
            .get(JwtService)
            .signAsync({ sub: invited.body.id, type: TokenType.INVITATION });
         const accept = () =>
            getHttpServer()
               .post(`/users/invitations/${token}/accept`)
               .send({ firstName: 'New', lastName: 'User', password: 'new-password-123' });
         await act(adminToken, 'deactivate', invited.body.id);

         const refused = await accept();
         const verify = await getHttpServer().head(`/users/invitations/${token}`);
         await act(adminToken, 'reactivate', invited.body.id);
         const accepted = await accept();

         expect(refused.status).toBe(400);
         expect(verify.status).toBe(400);
         expect(accepted.status).toBe(201);
         expect((await login('new@test.com', 'new-password-123')).status).toBe(201);
      });
   });

   describe('GET /users', () => {
      it('should list deactivated users by default and filter by status', async () => {
         const adminToken = await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         await act(adminToken, 'deactivate', user.id);
         const list = async (query: string) => {
            const response = await getHttpServer()
               .get(`/users${query}`)
               .set('Authorization', `Bearer ${adminToken}`);
            expect(response.status).toBe(200);
            return response.body.data.map((u: { email: string }) => u.email).sort();
         };

         expect(await list('')).toEqual(['admin@test.com', 'user@test.com']);
         expect(await list('?status=active')).toEqual(['admin@test.com']);
         expect(await list('?status=deactivated')).toEqual(['user@test.com']);
         const bad = await getHttpServer()
            .get('/users?status=bogus')
            .set('Authorization', `Bearer ${adminToken}`);
         expect(bad.status).toBe(400);
      });
   });

   describe('DELETE /users/:id', () => {
      it('should answer 409 pointing to deactivation for a user with an audit trail', async () => {
         const adminToken = await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         await prisma.auditLog.create({
            data: { userId: user.id, actorType: 'user', action: 'tag.create', resourceType: 'tag' },
         });

         const response = await getHttpServer()
            .delete(`/users/${user.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

         expect(response.status).toBe(409);
         expect(response.body.message).toMatch(/deactivate/i);
         expect(
            (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt,
         ).toBeNull();
      });

      it('should count the history written by a save in flight, not delete the user under it', async () => {
         const adminToken = await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         const writer = await holdLock(
            `INSERT INTO audit_logs (user_id, actor_type, action, resource_type)
             VALUES ($1, 'user', 'tag.create', 'tag')`,
            [user.id],
         );
         const request = startRequest(
            getHttpServer()
               .delete(`/users/${user.id}`)
               .set('Authorization', `Bearer ${adminToken}`),
         );
         await waitForLockWait(prisma);
         expect(request.isSettled()).toBe(false);

         await writer.release();
         const response = await request.promise;

         expect(response.status).toBe(409);
         expect(
            (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt,
         ).toBeNull();
      });

      it('should still delete a user without history', async () => {
         const adminToken = await createAdminAndLogin();
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });

         const response = await getHttpServer()
            .delete(`/users/${user.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

         expect(response.status).toBe(204);
      });
   });
});
