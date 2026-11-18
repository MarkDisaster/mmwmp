import * as bcrypt from 'bcryptjs';

import type { PermissionAction, PermissionResource } from '../../../prisma/generated/prisma/enums';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { UpdateUserTool } from '../../../src/user/tools/update-user.tool';
import { captureEmails } from '../../setup/emails';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin, createTestUser, loginAs, TEST_PASSWORD } from '../../setup/users';

type Grant = { resource: PermissionResource; action: PermissionAction };

describe('User management privileges (e2e)', () => {
   let prisma: PrismaService;
   let queued: jest.SpyInstance;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
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

   const MANAGER_GRANTS: Grant[] = [
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'create' },
      { resource: 'users', action: 'update' },
      { resource: 'users', action: 'delete' },
      { resource: 'projects', action: 'read' },
   ];

   const setup = async () => {
      const managerRole = await prisma.role.create({
         data: { name: 'manager', permissions: { create: MANAGER_GRANTS } },
      });
      const lowerRole = await prisma.role.create({
         data: {
            name: 'lower',
            permissions: { create: [{ resource: 'projects', action: 'read' }] },
         },
      });
      const higherRole = await prisma.role.create({
         data: {
            name: 'higher',
            permissions: { create: [...MANAGER_GRANTS, { resource: 'roles', action: 'update' }] },
         },
      });
      const manager = await createTestUser({ email: 'manager@test.com', role: 'manager' });
      const lower = await createTestUser({ email: 'lower@test.com', role: 'lower' });
      const higher = await createTestUser({ email: 'higher@test.com', role: 'higher' });
      const token = await loginAs('manager@test.com');
      return { managerRole, lowerRole, higherRole, manager, lower, higher, token };
   };

   const as = (token: string) => ({
      patch: (url: string, body: object) =>
         getHttpServer().patch(url).set('Authorization', `Bearer ${token}`).send(body),
      post: (url: string, body: object) =>
         getHttpServer().post(url).set('Authorization', `Bearer ${token}`).send(body),
      delete: (url: string) => getHttpServer().delete(url).set('Authorization', `Bearer ${token}`),
   });

   const roleOf = async (id: number) =>
      (await prisma.user.findUniqueOrThrow({ where: { id } })).roleId;

   describe('role changes', () => {
      it('should refuse a change of the own role on both endpoints', async () => {
         const { manager, higherRole, managerRole, token } = await setup();

         const viaRole = await as(token).patch(`/users/${manager.id}/role`, {
            roleId: higherRole.id,
         });
         const viaUpdate = await as(token).patch(`/users/${manager.id}`, { roleId: higherRole.id });

         expect(viaRole.status).toBe(403);
         expect(viaUpdate.status).toBe(403);
         expect(viaRole.body.message).toBe('Cannot modify your own account here, use your profile');
         expect(await roleOf(manager.id)).toBe(managerRole.id);
      });

      it('should refuse to give another user a role above the caller', async () => {
         const { lower, lowerRole, higherRole, token } = await setup();

         const response = await as(token).patch(`/users/${lower.id}/role`, {
            roleId: higherRole.id,
         });

         expect(response.status).toBe(403);
         expect(response.body.message).toBe(
            'Cannot assign a role with permissions you do not have',
         );
         expect(await roleOf(lower.id)).toBe(lowerRole.id);
      });

      it('should let the caller give a role within their permissions', async () => {
         const { lower, managerRole, token } = await setup();

         const response = await as(token).patch(`/users/${lower.id}/role`, {
            roleId: managerRole.id,
         });

         expect(response.status).toBe(200);
         expect(await roleOf(lower.id)).toBe(managerRole.id);
      });
   });

   describe('account takeover', () => {
      it('should refuse any change of a user above the caller', async () => {
         const { higher, token } = await setup();

         const rename = await as(token).patch(`/users/${higher.id}`, { firstName: 'Owned' });
         const remove = await as(token).delete(`/users/${higher.id}`);

         expect(rename.status).toBe(403);
         expect(rename.body.message).toBe('Cannot modify a user with permissions you do not have');
         expect(remove.status).toBe(403);
         const stored = await prisma.user.findUniqueOrThrow({ where: { id: higher.id } });
         expect(stored).toMatchObject({ firstName: 'Test', deletedAt: null });
      });

      it("should refuse a change of another user's email by a non-admin", async () => {
         const { lower, token } = await setup();

         const response = await as(token).patch(`/users/${lower.id}`, {
            email: 'attacker@test.com',
         });

         expect(response.status).toBe(403);
         expect(response.body.message).toBe(
            'Only an administrator can change the email of another user',
         );
         expect((await prisma.user.findUniqueOrThrow({ where: { id: lower.id } })).email).toBe(
            'lower@test.com',
         );
      });

      it("should never set another user's password, not even as an admin", async () => {
         const { lower } = await setup();
         const adminToken = await createAdminAndLogin();

         const response = await as(adminToken).patch(`/users/${lower.id}`, {
            firstName: 'Renamed',
            password: 'attacker-password',
         });

         expect(response.status).toBe(200);
         const auth = await prisma.auth.findUniqueOrThrow({ where: { userId: lower.id } });
         expect(await bcrypt.compare(TEST_PASSWORD, auth.password)).toBe(true);
         expect(await bcrypt.compare('attacker-password', auth.password)).toBe(false);
      });

      it("should let an admin change an email, end that user's sessions and refuse a taken one", async () => {
         const { lower } = await setup();
         const adminToken = await createAdminAndLogin();
         const login = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'lower@test.com', password: TEST_PASSWORD });
         const deleted = await createTestUser({ email: 'gone@test.com', role: 'lower' });
         await prisma.user.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });

         const taken = await as(adminToken).patch(`/users/${lower.id}`, { email: 'gone@test.com' });
         const changed = await as(adminToken).patch(`/users/${lower.id}`, {
            email: 'new@test.com',
         });
         const refresh = await getHttpServer()
            .post('/auth/refresh')
            .send({ refreshToken: login.body.refreshToken });

         expect(taken.status).toBe(409);
         expect(changed.status).toBe(200);
         expect(changed.body.email).toBe('new@test.com');
         expect(refresh.status).toBe(401);
      });

      it('should apply the rules to the AI updateUser tool', async () => {
         const { higher, higherRole, lower } = await setup();
         const user = await prisma.user.findUniqueOrThrow({
            where: { email: 'manager@test.com' },
            include: { role: { include: { permissions: true } } },
         });
         const tool = getApp().get(UpdateUserTool);
         const ctx = { user, conversationId: 'conversation' };

         await expect(tool.execute(ctx, { id: user.id, roleId: higherRole.id })).rejects.toThrow(
            'Cannot modify your own account here, use your profile',
         );
         await expect(tool.execute(ctx, { id: lower.id, roleId: higherRole.id })).rejects.toThrow(
            'Cannot assign a role with permissions you do not have',
         );
         await expect(tool.execute(ctx, { id: higher.id, firstName: 'Owned' })).rejects.toThrow(
            'Cannot modify a user with permissions you do not have',
         );
      });
   });

   describe('creating and inviting', () => {
      it('should refuse to create or invite a user into a role above the caller', async () => {
         const { higherRole, token } = await setup();

         const created = await as(token).post('/users', {
            email: 'twin@test.com',
            firstName: 'Twin',
            lastName: 'Account',
            password: 'password123',
            roleId: higherRole.id,
         });
         const invited = await as(token).post('/users/invitations', {
            email: 'invitee@test.com',
            roleId: higherRole.id,
         });

         expect(created.status).toBe(403);
         expect(invited.status).toBe(403);
         expect(
            await prisma.user.count({
               where: { email: { in: ['twin@test.com', 'invitee@test.com'] } },
            }),
         ).toBe(0);
         expect(queued).not.toHaveBeenCalled();
      });

      it('should let the caller invite into a role within their permissions', async () => {
         const { lowerRole, token } = await setup();

         const response = await as(token).post('/users/invitations', {
            email: 'invitee@test.com',
            roleId: lowerRole.id,
         });

         expect(response.status).toBe(201);
         expect(queued).toHaveBeenCalledTimes(1);
      });

      it('should refuse to resend the invitation of a pending user above the caller', async () => {
         const { higherRole, token } = await setup();
         const pending = await prisma.user.create({
            data: {
               email: 'pending@test.com',
               firstName: '',
               lastName: '',
               roleId: higherRole.id,
               invitedAt: new Date(),
            },
         });

         const response = await as(token).post(`/users/${pending.id}/resend-invitation`, {});

         expect(response.status).toBe(403);
         expect(queued).not.toHaveBeenCalled();
      });
   });

   describe('deleting', () => {
      it('should refuse to delete the own account, for an admin too', async () => {
         const { manager, token } = await setup();
         const adminToken = await createAdminAndLogin();
         const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });

         const self = await as(token).delete(`/users/${manager.id}`);
         const adminSelf = await as(adminToken).delete(`/users/${admin.id}`);

         expect(self.status).toBe(403);
         expect(adminSelf.status).toBe(400);
         expect(
            await prisma.user.count({
               where: { id: { in: [manager.id, admin.id] }, deletedAt: null },
            }),
         ).toBe(2);
      });

      it('should end the sessions of a deleted user', async () => {
         const { lower, token } = await setup();
         const login = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'lower@test.com', password: TEST_PASSWORD });

         const removed = await as(token).delete(`/users/${lower.id}`);
         const refresh = await getHttpServer()
            .post('/auth/refresh')
            .send({ refreshToken: login.body.refreshToken });
         const me = await getHttpServer()
            .get('/users/me')
            .set('Authorization', `Bearer ${login.body.accessToken}`);

         expect(removed.status).toBe(204);
         expect(refresh.status).toBe(401);
         expect(me.status).toBe(401);
         expect(
            await prisma.refreshToken.count({ where: { userId: lower.id, isRevoked: false } }),
         ).toBe(0);
      });
   });
});
