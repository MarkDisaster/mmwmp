import { PrismaService } from '../../../src/prisma/prisma.service';
import { RevalidationService } from '../../../src/revalidation/revalidation.service';
import { getApp, getHttpServer } from '../../setup/init';
import {
   countLockWaits,
   holdLock,
   holdRowLock,
   startRequest,
   waitForLockWait,
} from '../../setup/locks';
import { createAdminAndLogin, createTestUser, loginAs } from '../../setup/users';

type SavedService = {
   id: number;
   title: string;
   slug: string;
   status: string;
   showOnHomepage: boolean;
   sortOrder: number;
   publishedAt: string | null;
   translations: {
      language: string;
      title: string;
      description: string | null;
      content: string | null;
   }[];
   projects: { projectId: number; sortOrder: number; project: { id: number; slug: string } }[];
};

describe('Service save (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      jest.restoreAllMocks();
      await prisma.serviceProject.deleteMany();
      await prisma.serviceTranslation.deleteMany();
      await prisma.service.deleteMany();
      await prisma.project.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { name: 'nobody' } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const createProjects = async (...slugs: string[]) => {
      const ids: number[] = [];
      for (const slug of slugs) {
         const project = await prisma.project.create({ data: { slug, title: slug } });
         ids.push(project.id);
      }
      return ids;
   };

   const body = (overrides: Record<string, unknown> = {}) => ({
      slug: 'web-development',
      showOnHomepage: true,
      translations: [
         {
            language: 'cs',
            title: 'Vývoj webu',
            description: 'Weby na míru',
            content: '<p>Obsah</p><script>alert(1)</script>',
         },
         { language: 'en', title: 'Web development', content: '<p>Content</p>' },
      ],
      projectIds: [],
      ...overrides,
   });

   const saveNew = (token: string, data: Record<string, unknown>) =>
      getHttpServer().post('/services/save').set('Authorization', `Bearer ${token}`).send(data);

   const save = (token: string, id: number, data: Record<string, unknown>) =>
      getHttpServer()
         .put(`/services/${id}/save`)
         .set('Authorization', `Bearer ${token}`)
         .send(data);

   const stored = (id: number) =>
      prisma.service.findUniqueOrThrow({
         where: { id },
         include: {
            translations: { orderBy: { language: 'asc' } },
            projects: { orderBy: { sortOrder: 'asc' } },
         },
      });

   const byLanguage = (service: SavedService) =>
      Object.fromEntries(service.translations.map((tr) => [tr.language, tr]));

   describe('POST /services/save', () => {
      it('creates and publishes the whole editor state in one call', async () => {
         const token = await createAdminAndLogin();
         const [a, b, c] = await createProjects('a', 'b', 'c');

         const response = await saveNew(
            token,
            body({ status: 'published', projectIds: [c, a, b] }),
         );

         expect(response.status).toBe(201);
         const service = response.body as SavedService;
         expect(service).toMatchObject({
            title: 'Vývoj webu',
            slug: 'web-development',
            status: 'published',
            showOnHomepage: true,
            sortOrder: 0,
         });
         expect(service.publishedAt).not.toBeNull();
         expect(byLanguage(service)).toEqual({
            cs: expect.objectContaining({
               title: 'Vývoj webu',
               description: 'Weby na míru',
               content: '<p>Obsah</p>',
            }),
            en: expect.objectContaining({
               title: 'Web development',
               description: null,
               content: '<p>Content</p>',
            }),
         });
         expect(service.projects.map((sp) => [sp.project.id, sp.sortOrder])).toEqual([
            [c, 0],
            [a, 1],
            [b, 2],
         ]);

         const detail = await getHttpServer()
            .get(`/services/${service.id}`)
            .set('Authorization', `Bearer ${token}`);
         expect(detail.body).toEqual(service);
      });

      it('skips a language without a title and starts as a draft', async () => {
         const token = await createAdminAndLogin();

         const response = await saveNew(
            token,
            body({
               translations: [
                  { language: 'cs', title: 'Vývoj webu' },
                  { language: 'en', title: '  ', content: '<p>unfinished</p>' },
               ],
            }),
         );

         expect(response.status).toBe(201);
         expect(response.body.status).toBe('draft');
         expect(response.body.publishedAt).toBeNull();
         expect(response.body.translations.map((tr: { language: string }) => tr.language)).toEqual([
            'cs',
         ]);
      });

      it('puts a new service at the end of the manual order', async () => {
         const token = await createAdminAndLogin();
         await prisma.service.create({ data: { slug: 'first', title: 'first', sortOrder: 4 } });

         const response = await saveNew(token, body());

         expect(response.body.sortOrder).toBe(5);
      });

      it('stores nothing when a project does not exist', async () => {
         const token = await createAdminAndLogin();
         const [a] = await createProjects('a');

         const response = await saveNew(token, body({ projectIds: [a, 999999] }));

         expect(response.status).toBe(404);
         expect(await prisma.service.count()).toBe(0);
         expect(await prisma.serviceTranslation.count()).toBe(0);
         expect(await prisma.serviceProject.count()).toBe(0);
      });

      it('answers a taken slug with 409 and stores nothing', async () => {
         const token = await createAdminAndLogin();
         const first = await saveNew(token, body());
         expect(first.status).toBe(201);

         const response = await saveNew(
            token,
            body({ translations: [{ language: 'cs', title: 'X' }] }),
         );

         expect(response.status).toBe(409);
         expect(response.body.code).toBe('SLUG_TAKEN');
         expect(await prisma.service.count()).toBe(1);
         expect(await prisma.serviceTranslation.count()).toBe(2);
      });

      it('refuses a state without any title', async () => {
         const token = await createAdminAndLogin();

         const response = await saveNew(
            token,
            body({ translations: [{ language: 'cs', title: '' }] }),
         );

         expect(response.status).toBe(400);
         expect(await prisma.service.count()).toBe(0);
      });

      it('refuses the same language twice', async () => {
         const token = await createAdminAndLogin();

         const response = await saveNew(
            token,
            body({
               translations: [
                  { language: 'cs', title: 'A' },
                  { language: 'cs', title: 'B' },
               ],
            }),
         );

         expect(response.status).toBe(400);
      });

      it('refreshes the web once', async () => {
         const token = await createAdminAndLogin();
         const revalidate = jest.spyOn(getApp().get(RevalidationService), 'revalidate');

         const response = await saveNew(token, body({ status: 'published' }));

         expect(response.status).toBe(201);
         expect(revalidate).toHaveBeenCalledTimes(1);
         expect(revalidate).toHaveBeenCalledWith('services');
      });

      it('writes one audit entry for the save', async () => {
         const token = await createAdminAndLogin();

         const response = await saveNew(token, body());

         await new Promise((resolve) => setTimeout(resolve, 200));
         const entries = await prisma.auditLog.findMany({
            where: { action: 'service.saveNew', resourceId: String(response.body.id) },
         });
         expect(entries).toHaveLength(1);
      });
   });

   describe('PUT /services/:id/save', () => {
      it('replaces the translations and the order of the projects', async () => {
         const token = await createAdminAndLogin();
         const [a, b, c] = await createProjects('a', 'b', 'c');
         const created = await saveNew(token, body({ projectIds: [a, b] }));

         const response = await save(
            token,
            created.body.id,
            body({
               slug: 'web',
               showOnHomepage: false,
               translations: [
                  { language: 'cs', title: 'Weby', content: '<p>Nový</p>' },
                  { language: 'en', title: 'Websites', description: 'Custom' },
               ],
               projectIds: [c, a],
            }),
         );

         expect(response.status).toBe(200);
         const service = response.body as SavedService;
         expect(service).toMatchObject({ slug: 'web', title: 'Weby', showOnHomepage: false });
         expect(byLanguage(service)).toEqual({
            cs: expect.objectContaining({
               title: 'Weby',
               description: null,
               content: '<p>Nový</p>',
            }),
            en: expect.objectContaining({
               title: 'Websites',
               description: 'Custom',
               content: null,
            }),
         });
         expect(service.projects.map((sp) => sp.projectId)).toEqual([c, a]);
      });

      it('keeps a language that is not sent or has no title', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, body());

         const response = await save(
            token,
            created.body.id,
            body({
               translations: [
                  { language: 'cs', title: 'Weby' },
                  { language: 'en', title: '' },
               ],
            }),
         );

         expect(response.status).toBe(200);
         expect(byLanguage(response.body).en.title).toBe('Web development');
      });

      it('changes nothing when a project does not exist', async () => {
         const token = await createAdminAndLogin();
         const [a] = await createProjects('a');
         const created = await saveNew(token, body({ projectIds: [a] }));
         const before = await stored(created.body.id);

         const response = await save(
            token,
            created.body.id,
            body({
               slug: 'renamed',
               status: 'published',
               translations: [{ language: 'cs', title: 'Přejmenováno' }],
               projectIds: [999999],
            }),
         );

         expect(response.status).toBe(404);
         expect(await stored(created.body.id)).toEqual(before);
      });

      it('answers a slug of another service with 409 and changes nothing', async () => {
         const token = await createAdminAndLogin();
         await saveNew(token, body({ slug: 'taken' }));
         const created = await saveNew(token, body());
         const before = await stored(created.body.id);

         const response = await save(token, created.body.id, body({ slug: 'taken' }));

         expect(response.status).toBe(409);
         expect(response.body.code).toBe('SLUG_TAKEN');
         expect(await stored(created.body.id)).toEqual(before);
      });

      it('keeps its own slug', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, body());

         const response = await save(token, created.body.id, body());

         expect(response.status).toBe(200);
      });

      it('leaves the same service when the same request is sent again', async () => {
         const token = await createAdminAndLogin();
         const [a, b] = await createProjects('a', 'b');
         const created = await saveNew(token, body());
         const state = body({ status: 'published', projectIds: [b, a] });

         const first = await save(token, created.body.id, state);
         const retry = await save(token, created.body.id, state);

         expect(first.status).toBe(200);
         expect(retry.status).toBe(200);
         const stored = (saved: typeof first.body) => ({
            ...saved,
            updatedAt: null,
            version: null,
         });
         expect(stored(retry.body)).toEqual(stored(first.body));
         expect(retry.body.version).toBe(first.body.version + 1);
         expect(await prisma.serviceTranslation.count()).toBe(2);
         expect(await prisma.serviceProject.count()).toBe(2);
      });

      it('waits for the row lock of an overlapping writer, then applies the save', async () => {
         const token = await createAdminAndLogin();
         const [a, b] = await createProjects('a', 'b');
         const created = await saveNew(token, body({ projectIds: [a] }));
         const lock = await holdRowLock('services', created.body.id);

         const pending = startRequest(save(token, created.body.id, body({ projectIds: [b, a] })));
         try {
            await waitForLockWait(prisma);
            expect(pending.isSettled()).toBe(false);
            expect(await prisma.serviceProject.count()).toBe(1);
         } finally {
            await lock.release();
         }

         expect((await pending.promise).status).toBe(200);
         const projectIds = (await stored(created.body.id)).projects.map((sp) => sp.projectId);
         expect(projectIds).toEqual([b, a]);
      });

      it('makes the projects of a service (a single-part writer) wait for the same row lock', async () => {
         const token = await createAdminAndLogin();
         const [a] = await createProjects('a');
         const created = await saveNew(token, body());
         const lock = await holdRowLock('services', created.body.id);

         const pending = startRequest(
            getHttpServer()
               .post(`/services/${created.body.id}/projects`)
               .set('Authorization', `Bearer ${token}`)
               .send({ projectIds: [a] }),
         );
         try {
            await waitForLockWait(prisma);
            expect(pending.isSettled()).toBe(false);
         } finally {
            await lock.release();
         }

         expect((await pending.promise).status).toBeLessThan(300);
         expect(await prisma.serviceProject.count()).toBe(1);
      });

      it('does not wait for the row lock of a linked project (no key lock conflict)', async () => {
         const token = await createAdminAndLogin();
         const [a] = await createProjects('a');
         const created = await saveNew(token, body());
         const lock = await holdRowLock('projects', a);

         try {
            const response = await save(token, created.body.id, body({ projectIds: [a] }));
            expect(response.status).toBe(200);
            expect(await countLockWaits(prisma)).toBe(0);
         } finally {
            await lock.release();
         }
      });

      it('lets a project trash wait for a save that relinks the project instead of deadlocking', async () => {
         const token = await createAdminAndLogin();
         const [p, q] = await createProjects('p', 'q');
         const created = await saveNew(token, body({ projectIds: [p, q] }));
         const serviceId = created.body.id as number;
         const link = await holdLock(
            'SELECT 1 FROM service_projects WHERE service_id = $1 AND project_id = $2 FOR UPDATE',
            [serviceId, q],
         );
         const saving = startRequest(save(token, serviceId, body({ projectIds: [p] })));
         const deleting = await (async () => {
            try {
               await waitForLockWait(prisma);
               const request = startRequest(
                  getHttpServer().delete(`/projects/${p}`).set('Authorization', `Bearer ${token}`),
               );
               await waitForLockWait(prisma, 4_000, 2);
               return request;
            } finally {
               await link.release();
            }
         })();

         const [saved, deleted] = await Promise.all([saving.promise, deleting.promise]);
         expect(saved.status).toBe(200);
         expect(deleted.status).toBeLessThan(300);
         expect(
            (await prisma.project.findUniqueOrThrow({ where: { id: p } })).deletedAt,
         ).not.toBeNull();
         expect(await prisma.serviceProject.count({ where: { serviceId } })).toBe(1);
      });

      it('answers 404 and changes nothing when a linked project is deleted while the save waits', async () => {
         const token = await createAdminAndLogin();
         const [p] = await createProjects('p');
         const created = await saveNew(token, body());
         const removal = await holdLock('DELETE FROM projects WHERE id = $1', [p]);

         const pending = startRequest(save(token, created.body.id, body({ projectIds: [p] })));
         try {
            await waitForLockWait(prisma);
            expect(pending.isSettled()).toBe(false);
         } finally {
            await removal.release();
         }

         expect((await pending.promise).status).toBe(404);
         expect(await prisma.serviceProject.count()).toBe(0);
      });

      it('sets the publish date on publish and clears it on unpublish', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, body());

         const published = await save(token, created.body.id, body({ status: 'published' }));
         expect(published.body.status).toBe('published');
         expect(published.body.publishedAt).not.toBeNull();

         const kept = await save(token, created.body.id, body());
         expect(kept.body.status).toBe('published');
         expect(kept.body.publishedAt).toBe(published.body.publishedAt);

         const unpublished = await save(token, created.body.id, body({ status: 'draft' }));
         expect(unpublished.body.status).toBe('draft');
         expect(unpublished.body.publishedAt).toBeNull();
      });

      it('answers 404 for an unknown service', async () => {
         const token = await createAdminAndLogin();

         const response = await save(token, 999999, body());

         expect(response.status).toBe(404);
      });

      it('refreshes the web once', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, body());
         await new Promise((resolve) => setTimeout(resolve, 100));
         const revalidate = jest.spyOn(getApp().get(RevalidationService), 'revalidate');

         const response = await save(token, created.body.id, body({ status: 'published' }));

         expect(response.status).toBe(200);
         expect(revalidate).toHaveBeenCalledTimes(1);
      });
   });

   describe('permissions', () => {
      it('answers 401 without a token', async () => {
         expect((await getHttpServer().post('/services/save').send(body())).status).toBe(401);
         expect((await getHttpServer().put('/services/1/save').send(body())).status).toBe(401);
      });

      it('answers 403 to a role without the service permissions', async () => {
         await prisma.role.create({ data: { name: 'nobody' } });
         const admin = await createAdminAndLogin();
         const created = await saveNew(admin, body());
         await createTestUser({ email: 'nobody@test.com', role: 'nobody' });
         const token = await loginAs('nobody@test.com');

         expect((await saveNew(token, body({ slug: 'other' }))).status).toBe(403);
         expect((await save(token, created.body.id, body())).status).toBe(403);
         expect(await prisma.service.count()).toBe(1);
      });

      it('lets an editor save a draft but not publish it', async () => {
         await createTestUser({ email: 'editor@test.com', role: 'editor' });
         const token = await loginAs('editor@test.com');

         const refused = await saveNew(token, body({ status: 'published' }));
         expect(refused.status).toBe(403);
         expect(await prisma.service.count()).toBe(0);

         const created = await saveNew(token, body());
         expect(created.status).toBe(201);

         const publish = await save(token, created.body.id, body({ status: 'published' }));
         expect(publish.status).toBe(403);
         expect((await stored(created.body.id)).status).toBe('draft');

         const draft = await save(token, created.body.id, body({ status: 'draft' }));
         expect(draft.status).toBe(200);
      });
   });
});
