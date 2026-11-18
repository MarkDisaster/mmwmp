import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { tagBody } from '../../setup/tags';
import { createAdminAndLogin } from '../../setup/users';

describe('TagController (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectTag.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   describe('POST /tags', () => {
      it('should create a tag', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .send({ ...tagBody('react', 'React'), color: '#61DAFB' });

         expect(response.status).toBe(201);
         expect(response.body.translations).toEqual([{ language: 'cs', name: 'React' }]);
         expect(response.body).not.toHaveProperty('name');
         expect(response.body.slug).toBe('react');
         expect(response.body.color).toBe('#61DAFB');
      });

      it('should return 409 for duplicate slug', async () => {
         const token = await createAdminAndLogin();

         await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(tagBody('react', 'React'));

         const response = await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(tagBody('react', 'React 2'));

         expect(response.status).toBe(409);
      });
   });

   describe('GET /tags', () => {
      it('should return list of tags', async () => {
         const token = await createAdminAndLogin();

         await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(tagBody('react', 'React'));

         await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(tagBody('nestjs', 'NestJS'));

         const response = await getHttpServer()
            .get('/tags')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(2);
         expect(response.body.data).toHaveLength(2);
      });
   });

   describe('PATCH /tags/:id', () => {
      it('should update a tag', async () => {
         const token = await createAdminAndLogin();

         const createResponse = await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(tagBody('react', 'React'));

         const response = await getHttpServer()
            .patch(`/tags/${createResponse.body.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ translations: [{ language: 'cs', name: 'React.js' }], color: '#61DAFB' });

         expect(response.status).toBe(200);
         expect(response.body.translations).toEqual([{ language: 'cs', name: 'React.js' }]);
         expect(response.body.color).toBe('#61DAFB');
      });
   });

   describe('DELETE /tags/:id', () => {
      it('should delete a tag', async () => {
         const token = await createAdminAndLogin();

         const createResponse = await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(tagBody('react', 'React'));

         const response = await getHttpServer()
            .delete(`/tags/${createResponse.body.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(204);

         const listResponse = await getHttpServer()
            .get('/tags')
            .set('Authorization', `Bearer ${token}`);

         expect(listResponse.body.data).toHaveLength(0);
      });
   });

   describe('no status', () => {
      it('should have no status in the response and no status route', async () => {
         const token = await createAdminAndLogin();

         const created = await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(tagBody('react', 'React'));
         const route = await getHttpServer()
            .patch(`/tags/${created.body.id}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'published' });

         expect(created.status).toBe(201);
         expect(created.body).not.toHaveProperty('status');
         expect(created.body).not.toHaveProperty('publishedAt');
         expect(route.status).toBe(404);
      });
   });

   describe('GET /public/tags', () => {
      it('should return every tag outside the trash without auth', async () => {
         const token = await createAdminAndLogin();

         await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(tagBody('react', 'React'));
         const trashed = await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(tagBody('old', 'Old'));
         await getHttpServer()
            .delete(`/tags/${trashed.body.id}`)
            .set('Authorization', `Bearer ${token}`);

         const response = await getHttpServer().get('/public/tags');

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(1);
         expect(response.body.data).toHaveLength(1);
         expect(response.body.data[0].slug).toBe('react');
         expect(response.body.data[0]._count).toBeDefined();
         expect(response.body.data[0].translations).toEqual([{ language: 'cs', name: 'React' }]);
         expect(response.body.data[0]).not.toHaveProperty('createdById');
         expect(response.body.data[0]).not.toHaveProperty('status');
      });
   });
});
