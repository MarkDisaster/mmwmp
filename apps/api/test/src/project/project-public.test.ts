import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createProject, setProjectStatus } from '../../setup/projects';
import { createAdminAndLogin } from '../../setup/users';

describe('ProjectPublicController (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectMedia.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.file.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const createPublishedProject = async (token: string, slug: string, title: string) => {
      const created = await createProject(token, { slug, title, description: 'Test popis' });
      await setProjectStatus(token, created.id, 'published');
      return created;
   };

   describe('GET /public/projects', () => {
      it('should return only published projects', async () => {
         const token = await createAdminAndLogin();

         await createPublishedProject(token, 'published-1', 'Published 1');
         await createPublishedProject(token, 'published-2', 'Published 2');

         await createProject(token, { slug: 'draft', title: 'Draft' });

         const response = await getHttpServer().get('/public/projects');

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(2);
         expect(response.body.data).toHaveLength(2);
      });

      it('should filter by language', async () => {
         const token = await createAdminAndLogin();
         const project = await createPublishedProject(token, 'multi-lang', 'Český projekt');

         await getHttpServer()
            .post(`/projects/${project.id}/translations/en`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'English Project' })
            .expect(201);

         const response = await getHttpServer()
            .get('/public/projects')
            .set('Accept-Language', 'en');

         expect(response.status).toBe(200);
         expect(response.body.data[0].translations).toHaveLength(1);
         expect(response.body.data[0].translations[0].language).toBe('en');
      });

      it('should not require authentication', async () => {
         const response = await getHttpServer().get('/public/projects');

         expect(response.status).toBe(200);
         expect(response.body).toEqual({ data: [], totalCount: 0 });
      });
   });

   describe('GET /public/projects/:slug', () => {
      it('should return project by slug', async () => {
         const token = await createAdminAndLogin();
         await createPublishedProject(token, 'my-project', 'My Project');

         const response = await getHttpServer().get('/public/projects/my-project');

         expect(response.status).toBe(200);
         expect(response.body.slug).toBe('my-project');
      });

      it('should return 404 for draft project slug', async () => {
         const token = await createAdminAndLogin();

         await createProject(token, { slug: 'draft-only', title: 'Draft' });

         const response = await getHttpServer().get('/public/projects/draft-only');

         expect(response.status).toBe(404);
      });

      it('should return 404 for non-existent slug', async () => {
         const response = await getHttpServer().get('/public/projects/non-existent');

         expect(response.status).toBe(404);
      });
   });
});
