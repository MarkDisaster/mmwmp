import { EntityStatus, SlugRedirectResource } from '../../../prisma/generated/prisma/enums';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { RevalidationService } from '../../../src/revalidation/revalidation.service';
import { waitForAuditCount } from '../../setup/audit';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin, createTestUser, loginAs } from '../../setup/users';

describe('Slug redirects (e2e)', () => {
   let prisma: PrismaService;
   let token: string;
   let revalidate: jest.SpyInstance;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.slugRedirect.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.project.deleteMany();
      await prisma.service.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(async () => {
      await cleanupDb();
      revalidate = jest.spyOn(getApp().get(RevalidationService), 'revalidate').mockImplementation();
      token = await createAdminAndLogin();
   });
   afterEach(() => revalidate.mockRestore());
   afterAll(cleanupDb);

   const api = {
      get: (url: string, as: string | null = token) => {
         const request = getHttpServer().get(url);
         return as ? request.set('Authorization', `Bearer ${as}`) : request;
      },
      del: (url: string, as: string | null = token) => {
         const request = getHttpServer().delete(url);
         return as ? request.set('Authorization', `Bearer ${as}`) : request;
      },
   };

   const seed = async () => {
      const project = await prisma.project.create({
         data: { title: 'Nový', slug: 'new', status: EntityStatus.published },
      });
      const service = await prisma.service.create({
         data: { title: 'Služba', slug: 'svc', status: EntityStatus.published },
      });
      const projectRedirect = await prisma.slugRedirect.create({
         data: { resource: SlugRedirectResource.project, oldSlug: 'old', targetId: project.id },
      });
      const serviceRedirect = await prisma.slugRedirect.create({
         data: { resource: SlugRedirectResource.service, oldSlug: 'svc-old', targetId: service.id },
      });
      return { project, service, projectRedirect, serviceRedirect };
   };

   const loginEditor = async () => {
      await createTestUser({ email: 'editor@test.com', role: 'editor' });
      return loginAs('editor@test.com');
   };

   describe('GET /slug-redirects/:resource', () => {
      it('lists the redirects of the resource with the state of the target', async () => {
         const { project, projectRedirect } = await seed();

         const response = await api.get('/slug-redirects/projects');

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(1);
         expect(response.body.data).toEqual([
            expect.objectContaining({
               id: projectRedirect.id,
               oldSlug: 'old',
               targetId: project.id,
               targetTitle: 'Nový',
               targetSlug: 'new',
               targetState: 'published',
            }),
         ]);
         expect((await api.get('/slug-redirects/services')).body.data[0].oldSlug).toBe('svc-old');
      });

      it('answers 401 without a token and 403 without the read permission', async () => {
         await seed();
         const role = await prisma.role.create({ data: { name: 'nobody' } });
         await createTestUser({ email: 'nobody@test.com', role: role.name });
         const nobody = await loginAs('nobody@test.com');

         for (const resource of ['projects', 'services']) {
            expect((await api.get(`/slug-redirects/${resource}`, null)).status).toBe(401);
            expect((await api.get(`/slug-redirects/${resource}`, nobody)).status).toBe(403);
         }
      });

      it('checks the permission of the resource: a services-only reader may not list projects', async () => {
         await seed();
         const role = await prisma.role.create({
            data: {
               name: 'services-reader',
               permissions: { create: [{ resource: 'services', action: 'read' }] },
            },
         });
         await createTestUser({ email: 'svc@test.com', role: role.name });
         const reader = await loginAs('svc@test.com');

         expect((await api.get('/slug-redirects/services', reader)).status).toBe(200);
         expect((await api.get('/slug-redirects/projects', reader)).status).toBe(403);
      });

      it('rejects an invalid pagination query with 400', async () => {
         expect((await api.get('/slug-redirects/projects?page=-1')).status).toBe(400);
         expect((await api.get('/slug-redirects/projects?limit=1000')).status).toBe(400);
         expect((await api.get('/slug-redirects/projects?limit=abc')).status).toBe(400);
      });
   });

   describe('DELETE /slug-redirects/:resource/:id', () => {
      it.each([
         ['projects', 'projectRedirect', 'projects'],
         ['services', 'serviceRedirect', 'services'],
      ] as const)(
         'deletes a %s redirect (204), audits it and refreshes the web cache',
         async (resource, key, tag) => {
            const rows = await seed();
            const redirect = rows[key];

            const response = await api.del(`/slug-redirects/${resource}/${redirect.id}`);

            expect(response.status).toBe(204);
            expect(await prisma.slugRedirect.findUnique({ where: { id: redirect.id } })).toBeNull();
            expect(await prisma.slugRedirect.count()).toBe(1);
            expect(revalidate).toHaveBeenCalledWith(tag);
            expect(await waitForAuditCount(prisma, { action: 'slugRedirect.delete' })).toBe(1);
         },
      );

      it('drops the cached public redirect lookup, so the deleted address stops redirecting at once', async () => {
         const { project, service, projectRedirect, serviceRedirect } = await seed();
         const lookup = (resource: string, slug: string) =>
            api.get(`/public/${resource}/redirect/${slug}`, null);

         expect((await lookup('projects', 'old')).body).toEqual({ slug: 'new' });
         expect((await lookup('services', 'svc-old')).body).toEqual({ slug: 'svc' });
         await prisma.project.update({ where: { id: project.id }, data: { slug: 'newer' } });
         await prisma.service.update({ where: { id: service.id }, data: { slug: 'svc-newer' } });
         expect((await lookup('projects', 'old')).body).toEqual({ slug: 'new' });
         expect((await lookup('services', 'svc-old')).body).toEqual({ slug: 'svc' });

         expect((await api.del(`/slug-redirects/projects/${projectRedirect.id}`)).status).toBe(204);

         expect((await lookup('projects', 'old')).status).toBe(404);
         expect((await lookup('services', 'svc-old')).body).toEqual({ slug: 'svc' });
         expect((await api.del(`/slug-redirects/services/${serviceRedirect.id}`)).status).toBe(204);
         expect((await lookup('services', 'svc-old')).status).toBe(404);
      });

      it('answers 404 for an unknown id and for the id of the other resource', async () => {
         const { serviceRedirect } = await seed();

         expect((await api.del('/slug-redirects/projects/999999')).status).toBe(404);
         expect((await api.del(`/slug-redirects/projects/${serviceRedirect.id}`)).status).toBe(404);
         expect(await prisma.slugRedirect.count()).toBe(2);
         expect(revalidate).not.toHaveBeenCalled();
      });

      it('answers 400 for an id that is not a number', async () => {
         expect((await api.del('/slug-redirects/projects/abc')).status).toBe(400);
      });

      it('answers 401 without a token', async () => {
         const { projectRedirect, serviceRedirect } = await seed();

         expect(
            (await api.del(`/slug-redirects/projects/${projectRedirect.id}`, null)).status,
         ).toBe(401);
         expect(
            (await api.del(`/slug-redirects/services/${serviceRedirect.id}`, null)).status,
         ).toBe(401);
         expect(await prisma.slugRedirect.count()).toBe(2);
      });

      it('answers 403 for an editor: update is not enough, the publish permission is needed', async () => {
         const { projectRedirect, serviceRedirect } = await seed();
         const editor = await loginEditor();

         expect(
            (await api.del(`/slug-redirects/projects/${projectRedirect.id}`, editor)).status,
         ).toBe(403);
         expect(
            (await api.del(`/slug-redirects/services/${serviceRedirect.id}`, editor)).status,
         ).toBe(403);
         expect(await prisma.slugRedirect.count()).toBe(2);
         expect(revalidate).not.toHaveBeenCalled();
      });

      it('answers 403 for the publish permission of the other resource', async () => {
         const { projectRedirect } = await seed();
         const role = await prisma.role.create({
            data: {
               name: 'services-publisher',
               permissions: { create: [{ resource: 'services', action: 'publish' }] },
            },
         });
         await createTestUser({ email: 'sp@test.com', role: role.name });

         expect(
            (
               await api.del(
                  `/slug-redirects/projects/${projectRedirect.id}`,
                  await loginAs('sp@test.com'),
               )
            ).status,
         ).toBe(403);
      });
   });
});
