import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin } from '../../setup/users';

describe('Project SEO: slug redirects (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.slugRedirect.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.projectLink.deleteMany();
      await prisma.project.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { isSystem: false } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const form = (overrides: Record<string, unknown> = {}) => ({
      slug: 'first-slug',
      thumbnailId: null,
      showOnHomepage: false,
      company: null,
      startYear: null,
      endYear: null,
      translations: [{ language: 'cs', title: 'Projekt' }],
      tagIds: [],
      links: [],
      media: [],
      ...overrides,
   });

   const saveNew = (token: string, data: Record<string, unknown>) =>
      getHttpServer().post('/projects/save').set('Authorization', `Bearer ${token}`).send(data);

   const save = (token: string, id: number, data: Record<string, unknown>) =>
      getHttpServer()
         .put(`/projects/${id}/save`)
         .set('Authorization', `Bearer ${token}`)
         .send(data);

   const patch = (token: string, id: number, data: Record<string, unknown>) =>
      getHttpServer().patch(`/projects/${id}`).set('Authorization', `Bearer ${token}`).send(data);

   const redirect = (slug: string) => getHttpServer().get(`/public/projects/redirect/${slug}`);

   describe('slug redirects', () => {
      it('redirects the former slug of a published project to the current one', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, form({ status: 'published' })).expect(201);

         const renamed = await save(
            token,
            created.body.id,
            form({ slug: 'second-slug', status: 'published' }),
         );

         expect(renamed.status).toBe(200);
         const response = await redirect('first-slug');
         expect(response.status).toBe(200);
         expect(response.body).toEqual({ slug: 'second-slug' });
         expect((await getHttpServer().get('/public/projects/first-slug')).status).toBe(404);
      });

      it('follows a chain of renames without a chain of rows and drops a redirect to the slug in use', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, form({ status: 'published' })).expect(201);
         const id = created.body.id as number;

         await patch(token, id, { slug: 'second-slug' }).expect(200);
         expect((await redirect('first-slug')).body).toEqual({ slug: 'second-slug' });
         await patch(token, id, { slug: 'third-slug' }).expect(200);

         expect((await redirect('first-slug')).body).toEqual({ slug: 'third-slug' });
         expect((await redirect('second-slug')).body).toEqual({ slug: 'third-slug' });

         await patch(token, id, { slug: 'first-slug' }).expect(200);
         expect((await redirect('first-slug')).status).toBe(404);
         expect((await redirect('third-slug')).body).toEqual({ slug: 'first-slug' });
         expect(await prisma.slugRedirect.count()).toBe(2);
      });

      it('leaves no redirect when a draft is renamed', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, form()).expect(201);

         await save(token, created.body.id, form({ slug: 'second-slug' })).expect(200);

         expect(await prisma.slugRedirect.count()).toBe(0);
         expect((await redirect('first-slug')).status).toBe(404);
      });

      it('does not redirect to a project that is a draft again', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, form({ status: 'published' })).expect(201);
         await patch(token, created.body.id, { slug: 'second-slug' }).expect(200);
         await getHttpServer()
            .patch(`/projects/${created.body.id}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'draft' })
            .expect(200);

         expect((await redirect('first-slug')).status).toBe(404);
      });

      it('refreshes a cached redirect when the project is renamed again', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, form({ status: 'published' })).expect(201);
         await patch(token, created.body.id, { slug: 'second-slug' }).expect(200);
         expect((await redirect('first-slug')).body).toEqual({ slug: 'second-slug' });

         await patch(token, created.body.id, { slug: 'third-slug' }).expect(200);

         expect((await redirect('first-slug')).body).toEqual({ slug: 'third-slug' });
      });

      it('drops the redirects of a purged project and of a slug a new project takes', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, form({ status: 'published' })).expect(201);
         await patch(token, created.body.id, { slug: 'second-slug' }).expect(200);

         await saveNew(token, form({ slug: 'first-slug' })).expect(201);
         expect(await prisma.slugRedirect.count()).toBe(0);

         await patch(token, created.body.id, { slug: 'third-slug' }).expect(200);
         expect(await prisma.slugRedirect.count()).toBe(1);
         await getHttpServer()
            .delete(`/projects/${created.body.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(204);
         expect(await prisma.slugRedirect.count()).toBe(1);
         expect((await redirect('second-slug')).status).toBe(404);
         await getHttpServer()
            .delete(`/projects/${created.body.id}/permanent`)
            .set('Authorization', `Bearer ${token}`)
            .expect(204);
         expect(await prisma.slugRedirect.count()).toBe(0);
      });

      it('is public and answers 404 for an unknown slug', async () => {
         expect((await redirect('nothing-here')).status).toBe(404);
      });
   });
});
