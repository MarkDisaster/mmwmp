import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { holdLock, startRequest, waitForLockWait } from '../../setup/locks';
import { createAdminAndLogin, createTestUser } from '../../setup/users';

describe('Role writes and overlapping writes (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { isSystem: false } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   it('should answer 409 when the same name is created by a write that commits meanwhile', async () => {
      const token = await createAdminAndLogin();
      const other = await holdLock(`INSERT INTO roles (name, updated_at) VALUES ($1, now())`, [
         'writers',
      ]);

      const request = startRequest(
         getHttpServer()
            .post('/roles')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'writers' }),
      );
      await waitForLockWait(prisma);
      await other.release();
      const response = await request.promise;

      expect(response.status).toBe(409);
      expect(await prisma.role.count({ where: { name: 'writers' } })).toBe(1);
   });

   it('should refuse to delete a role that a concurrent write gives to a user', async () => {
      const token = await createAdminAndLogin();
      const role = await prisma.role.create({ data: { name: 'writers' } });
      const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
      const assignment = await holdLock(
         `WITH locked AS (SELECT id FROM roles WHERE id = $1 FOR SHARE)
          UPDATE users SET role_id = (SELECT id FROM locked) WHERE id = $2`,
         [role.id, user.id],
      );

      const request = startRequest(
         getHttpServer().delete(`/roles/${role.id}`).set('Authorization', `Bearer ${token}`),
      );
      await waitForLockWait(prisma);
      await assignment.release();
      const response = await request.promise;

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cannot delete role that is assigned to users');
      expect(await prisma.role.findUnique({ where: { id: role.id } })).not.toBeNull();
   });

   it('should answer 409 to a rename while another write holds the role', async () => {
      const token = await createAdminAndLogin();
      const role = await prisma.role.create({ data: { name: 'writers' } });
      const other = await holdLock(`SELECT id FROM roles WHERE id = $1 FOR NO KEY UPDATE`, [
         role.id,
      ]);

      try {
         const response = await getHttpServer()
            .patch(`/roles/${role.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'editors-2' });

         expect(response.status).toBe(409);
         expect((await prisma.role.findUniqueOrThrow({ where: { id: role.id } })).name).toBe(
            'writers',
         );
      } finally {
         await other.release();
      }
   }, 15_000);
});
