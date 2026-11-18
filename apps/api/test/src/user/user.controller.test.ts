import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createTestUser, loginAs } from '../../setup/users';

describe('UserController (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   describe('GET /users', () => {
      it('should return list of users', async () => {
         await createTestUser();
         const token = await loginAs();

         const response = await getHttpServer()
            .get('/users')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(1);
         expect(response.body.data[0].email).toBe('admin@test.com');
      });

      it('should return 401 without token', async () => {
         const response = await getHttpServer().get('/users');
         expect(response.status).toBe(401);
      });

      it('should return 403 for a role without the users read permission', async () => {
         await createTestUser();
         await createTestUser({ email: 'editor@test.com', role: 'editor' });
         const editorToken = await loginAs('editor@test.com');

         const response = await getHttpServer()
            .get('/users')
            .set('Authorization', `Bearer ${editorToken}`);

         expect(response.status).toBe(403);
      });
   });

   describe('GET /users/me', () => {
      it('should return current user', async () => {
         await createTestUser();
         const token = await loginAs();

         const response = await getHttpServer()
            .get('/users/me')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.email).toBe('admin@test.com');
         expect(response.body.firstName).toBe('Test');
      });
   });

   describe('GET /users/:id', () => {
      it('should return 403 for a role without the users read permission', async () => {
         const admin = await createTestUser();
         await createTestUser({ email: 'editor@test.com', role: 'editor' });
         const editorToken = await loginAs('editor@test.com');

         const response = await getHttpServer()
            .get(`/users/${admin.id}`)
            .set('Authorization', `Bearer ${editorToken}`);

         expect(response.status).toBe(403);
      });

      it('should return user by id', async () => {
         const user = await createTestUser();
         const token = await loginAs();

         const response = await getHttpServer()
            .get(`/users/${user.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.id).toBe(user.id);
      });

      it('should return 404 for non-existent user', async () => {
         await createTestUser();
         const token = await loginAs();

         const response = await getHttpServer()
            .get('/users/99999')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(404);
      });
   });

   describe('PATCH /users/me/name', () => {
      it('should update current user name', async () => {
         await createTestUser();
         const token = await loginAs();

         const response = await getHttpServer()
            .patch('/users/me/name')
            .set('Authorization', `Bearer ${token}`)
            .send({ firstName: 'Marek', lastName: 'Novak' });

         expect(response.status).toBe(200);
         expect(response.body.firstName).toBe('Marek');
         expect(response.body.lastName).toBe('Novak');
      });

      it('should return 400 with empty name', async () => {
         await createTestUser();
         const token = await loginAs();

         const response = await getHttpServer()
            .patch('/users/me/name')
            .set('Authorization', `Bearer ${token}`)
            .send({ firstName: '', lastName: '' });

         expect(response.status).toBe(400);
      });
   });

   describe('DELETE /users/:id', () => {
      it('should soft delete user as admin', async () => {
         await createTestUser();
         const chief = await createTestUser({ email: 'chief@test.com', role: 'editor' });
         const token = await loginAs();

         const response = await getHttpServer()
            .delete(`/users/${chief.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(204);

         const listResponse = await getHttpServer()
            .get('/users')
            .set('Authorization', `Bearer ${token}`);

         const emails = listResponse.body.data.map((u: { email: string }) => u.email);
         expect(emails).not.toContain('chief@test.com');
      });

      it('should return 403 for a role without the users delete permission', async () => {
         await createTestUser({ email: 'chief@test.com', role: 'editor' });
         const peer = await createTestUser({ email: 'peer@test.com', role: 'editor' });
         const chiefToken = await loginAs('chief@test.com');

         const response = await getHttpServer()
            .delete(`/users/${peer.id}`)
            .set('Authorization', `Bearer ${chiefToken}`);

         expect(response.status).toBe(403);
         expect(response.body.message).toBe('Insufficient permissions');
         const stored = await prisma.user.findUniqueOrThrow({ where: { id: peer.id } });
         expect(stored.deletedAt).toBeNull();
      });
   });
});
