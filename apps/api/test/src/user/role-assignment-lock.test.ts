import pg from 'pg';

import { PrismaService } from '../../../src/prisma/prisma.service';
import { captureEmails } from '../../setup/emails';
import { getApp, getHttpServer } from '../../setup/init';
import { startRequest, waitForLockWait } from '../../setup/locks';
import { createTestUser, loginAs } from '../../setup/users';

describe('Role assignment and a concurrent grant (e2e)', () => {
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

   const setup = async () => {
      await prisma.role.create({
         data: {
            name: 'manager',
            permissions: {
               create: [
                  { resource: 'users', action: 'read' },
                  { resource: 'users', action: 'create' },
                  { resource: 'users', action: 'update' },
               ],
            },
         },
      });
      const target = await prisma.role.create({
         data: { name: 'target', permissions: { create: [{ resource: 'users', action: 'read' }] } },
      });
      await prisma.role.create({
         data: { name: 'other', permissions: { create: [{ resource: 'users', action: 'read' }] } },
      });
      await createTestUser({ email: 'manager@test.com', role: 'manager' });
      const user = await createTestUser({ email: 'user@test.com', role: 'other' });
      return { target, user, token: await loginAs('manager@test.com') };
   };

   const holdGrant = async (roleId: number) => {
      const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      await client.query('BEGIN');
      await client.query('SELECT id FROM roles WHERE id = $1 FOR NO KEY UPDATE', [roleId]);
      await client.query(
         `INSERT INTO role_permissions (role_id, resource, action) VALUES ($1, 'projects', 'delete')`,
         [roleId],
      );
      return {
         commit: async () => {
            await client.query('COMMIT');
            await client.end();
         },
      };
   };

   const roleOf = async (id: number) =>
      (await prisma.user.findUniqueOrThrow({ where: { id } })).roleId;

   it('should make the change of a role wait for a grant and refuse the grown role', async () => {
      const { target, user, token } = await setup();
      const grant = await holdGrant(target.id);

      const request = startRequest(
         getHttpServer()
            .patch(`/users/${user.id}/role`)
            .set('Authorization', `Bearer ${token}`)
            .send({ roleId: target.id }),
      );
      await waitForLockWait(prisma);
      expect(request.isSettled()).toBe(false);

      await grant.commit();
      const response = await request.promise;

      expect(response.status).toBe(403);
      expect(await roleOf(user.id)).not.toBe(target.id);
   });

   it('should make the creation of a user wait for a grant and refuse the grown role', async () => {
      const { target, token } = await setup();
      const grant = await holdGrant(target.id);

      const request = startRequest(
         getHttpServer().post('/users').set('Authorization', `Bearer ${token}`).send({
            email: 'new@test.com',
            password: 'password123',
            firstName: 'New',
            lastName: 'User',
            roleId: target.id,
         }),
      );
      await waitForLockWait(prisma);
      expect(request.isSettled()).toBe(false);

      await grant.commit();
      const response = await request.promise;

      expect(response.status).toBe(403);
      expect(await prisma.user.findUnique({ where: { email: 'new@test.com' } })).toBeNull();
   });

   it('should make an invitation wait for a grant and refuse the grown role', async () => {
      const { target, token } = await setup();
      const grant = await holdGrant(target.id);

      const request = startRequest(
         getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: 'invited@test.com', roleId: target.id }),
      );
      await waitForLockWait(prisma);
      expect(request.isSettled()).toBe(false);

      await grant.commit();
      const response = await request.promise;

      expect(response.status).toBe(403);
      expect(await prisma.user.findUnique({ where: { email: 'invited@test.com' } })).toBeNull();
      expect(queued).not.toHaveBeenCalled();
   });
});
