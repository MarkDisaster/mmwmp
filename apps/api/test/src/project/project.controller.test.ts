import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createProject, setProjectStatus } from '../../setup/projects';
import { createAdminAndLogin } from '../../setup/users';

describe('ProjectController (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectTranslation.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.projectMedia.deleteMany();
      await prisma.project.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   describe('POST /projects', () => {
      it('should create a project with initial translation', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/projects')
            .set('Authorization', `Bearer ${token}`)
            .send({
               title: 'Test Project',
               slug: 'test-project',
               language: 'cs',
               description: 'Testovací projekt',
            });

         expect(response.status).toBe(201);
         expect(response.body.translations).toHaveLength(1);
         expect(response.body.translations[0].title).toBe('Test Project');
         expect(response.body.translations[0].language).toBe('cs');
      });

      it('should return 401 without auth', async () => {
         const response = await getHttpServer()
            .post('/projects')
            .send({ title: 'Test', slug: 'test', language: 'cs' });

         expect(response.status).toBe(401);
      });
   });

   describe('GET /projects', () => {
      it('should return list of projects', async () => {
         const token = await createAdminAndLogin();

         await createProject(token, { slug: 'project-1', title: 'Project 1' });

         await createProject(token, { slug: 'project-2', title: 'Project 2' });

         const response = await getHttpServer()
            .get('/projects')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(2);
         expect(response.body.data).toHaveLength(2);
      });

      it('should filter by status before paginating and counting', async () => {
         const token = await createAdminAndLogin();
         const slugs = ['p1', 'p2', 'p3'];
         const ids: number[] = [];
         for (const slug of slugs) {
            const created = await createProject(token, { slug });
            ids.push(created.id);
         }
         await setProjectStatus(token, ids[2], 'published');

         const response = await getHttpServer()
            .get('/projects?status=draft&limit=1&page=1')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(2);
         expect(response.body.data).toHaveLength(1);
         expect(response.body.data[0].status).toBe('draft');
      });

      it('should reject an unknown status', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .get('/projects?status=archived')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(400);
      });
   });

   describe('GET /projects/:id', () => {
      it('should return project detail with translations', async () => {
         const token = await createAdminAndLogin();

         const created = await createProject(token, { slug: 'detail-test', title: 'Detail Test' });

         const response = await getHttpServer()
            .get(`/projects/${created.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.slug).toBe('detail-test');
      });

      it('should return 404 for non-existent project', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .get('/projects/99999')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(404);
      });
   });

   describe('PATCH /projects/:id', () => {
      it('should update project status to published', async () => {
         const token = await createAdminAndLogin();

         const created = await createProject(token, { slug: 'to-publish', title: 'To Publish' });

         const response = await getHttpServer()
            .patch(`/projects/${created.id}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'published' });

         expect(response.status).toBe(200);
         expect(response.body.status).toBe('published');
         expect(response.body.publishedAt).toBeDefined();
      });
   });

   describe('DELETE /projects/:id', () => {
      it('should delete project', async () => {
         const token = await createAdminAndLogin();

         const created = await createProject(token, { slug: 'to-delete', title: 'To Delete' });

         const response = await getHttpServer()
            .delete(`/projects/${created.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(204);

         const check = await getHttpServer()
            .get(`/projects/${created.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(check.status).toBe(404);
      });
   });

   describe('POST /projects/:id/translations/:language', () => {
      it('should add translation to project', async () => {
         const token = await createAdminAndLogin();

         const created = await createProject(token, {
            slug: 'cesky-projekt',
            title: 'Český projekt',
         });

         const response = await getHttpServer()
            .post(`/projects/${created.id}/translations/en`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'English Project' });

         expect(response.status).toBe(201);
         expect(response.body.language).toBe('en');
         expect(response.body.title).toBe('English Project');
      });

      it('should update existing translation', async () => {
         const token = await createAdminAndLogin();

         const created = await createProject(token, { slug: 'original', title: 'Original' });

         const response = await getHttpServer()
            .post(`/projects/${created.id}/translations/cs`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Updated' });

         expect(response.status).toBe(201);
         expect(response.body.title).toBe('Updated');
      });
   });

   describe('DELETE /projects/:id/translations/:language', () => {
      it('should delete translation', async () => {
         const token = await createAdminAndLogin();

         const created = await createProject(token, { slug: 'multi-lang', title: 'Multi Lang' });

         await getHttpServer()
            .post(`/projects/${created.id}/translations/en`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'English' })
            .expect(201);

         const response = await getHttpServer()
            .delete(`/projects/${created.id}/translations/en`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(204);
      });

      it('should return 404 for non-existent translation', async () => {
         const token = await createAdminAndLogin();

         const created = await createProject(token, { slug: 'no-en', title: 'No EN' });

         const response = await getHttpServer()
            .delete(`/projects/${created.id}/translations/en`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(404);
      });
   });
});
