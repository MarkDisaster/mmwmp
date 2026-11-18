import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin, createTestUser, loginAs } from '../../setup/users';

describe('Bull Board (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const get = (path: string, token?: string) => {
      const request = getHttpServer().get(path);
      return token ? request.set('Authorization', `Bearer ${token}`) : request;
   };

   it.each(['/queues', '/queues/api/queues'])(
      'should answer 401 to %s without a token',
      async (path) => {
         expect((await get(path)).status).toBe(401);
      },
   );

   it('should answer 401 to an invalid token', async () => {
      expect((await get('/queues/api/queues', 'not-a-jwt')).status).toBe(401);
   });

   it('should answer 403 to a signed-in user without the admin role', async () => {
      await createTestUser({ email: 'editor@test.com', role: 'editor' });
      const token = await loginAs('editor@test.com');

      expect((await get('/queues/api/queues', token)).status).toBe(403);
   });

   it('should list the queues to an admin', async () => {
      const token = await createAdminAndLogin();

      const response = await get('/queues/api/queues', token);

      expect(response.status).toBe(200);
      expect(response.body.queues.map((queue: { name: string }) => queue.name)).toContain('email');
   });
});
