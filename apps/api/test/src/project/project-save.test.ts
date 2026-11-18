import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { PrismaService } from '../../../src/prisma/prisma.service';
import { RevalidationService } from '../../../src/revalidation/revalidation.service';
import { getApp, getHttpServer } from '../../setup/init';
import { holdRowLock, startRequest, waitForLockWait } from '../../setup/locks';
import { names } from '../../setup/tags';
import { createAdminAndLogin, createTestUser, loginAs } from '../../setup/users';

type MediaRow = { id: number; fileId: number; language: string | null; sortOrder: number };
type ProjectBody = {
   id: number;
   title: string;
   slug: string;
   status: string;
   publishedAt: string | null;
   company: string | null;
   startYear: number | null;
   endYear: number | null;
   showOnHomepage: boolean;
   thumbnailId: number | null;
   translations: {
      language: string;
      title: string;
      description: string | null;
      role: string | null;
      content: string | null;
   }[];
   tags: { tagId: number }[];
   links: { label: string | null; url: string }[];
   media: MediaRow[];
};

describe('Project aggregate save (e2e)', () => {
   let prisma: PrismaService;
   let revalidate: jest.SpyInstance;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectLink.deleteMany();
      await prisma.projectMedia.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.file.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { isSystem: false } });
   };

   beforeEach(async () => {
      await cleanupDb();
      revalidate = jest.spyOn(getApp().get(RevalidationService), 'revalidate');
   });
   afterEach(() => revalidate.mockRestore());
   afterAll(cleanupDb);

   const createFile = (name: string) =>
      prisma.file.create({
         data: {
            filename: `${name}.jpg`,
            originalName: `${name}.jpg`,
            mimeType: 'image/jpeg',
            size: 1024,
            storagePath: `projects/${name}.jpg`,
         },
      });

   const createTag = (name: string) =>
      prisma.tag.create({ data: { translations: names(name), slug: name } });

   const baseForm = (overrides: Record<string, unknown> = {}) => ({
      slug: 'saved-project',
      thumbnailId: null,
      showOnHomepage: false,
      company: null,
      startYear: null,
      endYear: null,
      translations: [{ language: 'cs', title: 'Uložený projekt' }],
      tagIds: [],
      links: [],
      media: [],
      ...overrides,
   });

   const saveNew = (token: string, body: object) =>
      getHttpServer().post('/projects/save').set('Authorization', `Bearer ${token}`).send(body);

   const saveExisting = (token: string, id: number, body: object) =>
      getHttpServer()
         .put(`/projects/${id}/save`)
         .set('Authorization', `Bearer ${token}`)
         .send(body);

   const snapshot = async () => ({
      projects: await prisma.project.findMany({ orderBy: { id: 'asc' } }),
      translations: await prisma.projectTranslation.findMany({ orderBy: { id: 'asc' } }),
      tags: await prisma.projectTag.findMany({ orderBy: [{ projectId: 'asc' }, { tagId: 'asc' }] }),
      links: await prisma.projectLink.findMany({ orderBy: { id: 'asc' } }),
      media: await prisma.projectMedia.findMany({ orderBy: { id: 'asc' } }),
   });

   const revalidatedProjects = () =>
      revalidate.mock.calls.filter(([tag]) => tag === 'projects').length;

   const failMediaInserts = async () => {
      await prisma.$executeRawUnsafe(`
         CREATE OR REPLACE FUNCTION e2e_fail_media_insert() RETURNS trigger AS $$
         BEGIN RAISE EXCEPTION 'injected media failure'; END $$ LANGUAGE plpgsql`);
      await prisma.$executeRawUnsafe(`
         CREATE TRIGGER e2e_fail_media_insert BEFORE INSERT ON project_media
         FOR EACH ROW EXECUTE FUNCTION e2e_fail_media_insert()`);
   };
   const restoreMediaInserts = async () => {
      await prisma.$executeRawUnsafe(
         'DROP TRIGGER IF EXISTS e2e_fail_media_insert ON project_media',
      );
      await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS e2e_fail_media_insert()');
   };

   describe('POST /projects/save', () => {
      it('should create the project with everything and publish it in one call', async () => {
         const token = await createAdminAndLogin();
         const [thumbnail, image, video] = await Promise.all([
            createFile('thumb'),
            createFile('image'),
            createFile('video'),
         ]);
         const [react, nest] = await Promise.all([createTag('react'), createTag('nest')]);

         const response = await saveNew(
            token,
            baseForm({
               thumbnailId: thumbnail.id,
               showOnHomepage: true,
               company: '  ACME  ',
               startYear: 2020,
               endYear: null,
               status: 'published',
               translations: [
                  {
                     language: 'en',
                     title: 'Saved project',
                     role: ' Frontend ',
                     content: '<p>Hi</p><script>alert(1)</script>',
                     metaTitle: '',
                  },
                  { language: 'cs', title: 'Uložený projekt', description: 'Tom & Jerry <b>a</b>' },
               ],
               tagIds: [nest.id, react.id],
               links: [
                  { label: 'Live', url: 'https://example.com' },
                  { url: 'https://github.com/example/repo' },
               ],
               media: [
                  { fileId: video.id, language: 'en' },
                  { fileId: image.id },
                  { fileId: video.id, language: 'en' },
               ],
            }),
         );

         expect(response.status).toBe(201);
         const body = response.body as ProjectBody;
         expect(body.status).toBe('published');
         expect(body.publishedAt).not.toBeNull();
         expect(body.company).toBe('ACME');
         expect(body.showOnHomepage).toBe(true);
         expect(body.thumbnailId).toBe(thumbnail.id);
         expect(body.title).toBe('Uložený projekt');
         const en = body.translations.find((t) => t.language === 'en');
         expect(en?.role).toBe('Frontend');
         expect(en?.content).toBe('<p>Hi</p>');
         const cs = body.translations.find((t) => t.language === 'cs');
         expect(cs?.description).toBe('Tom & Jerry a');
         expect(body.tags.map((t) => t.tagId)).toEqual([nest.id, react.id]);
         expect(body.links.map((l) => [l.label, l.url])).toEqual([
            ['Live', 'https://example.com'],
            [null, 'https://github.com/example/repo'],
         ]);
         expect(body.media.map((m) => [m.fileId, m.language, m.sortOrder])).toEqual([
            [video.id, 'en', 0],
            [image.id, null, 1],
            [video.id, 'en', 2],
         ]);

         const detail = await getHttpServer()
            .get(`/projects/${body.id}`)
            .set('Authorization', `Bearer ${token}`);
         expect(detail.body).toEqual(response.body);
         expect(revalidatedProjects()).toBe(1);
      });

      it('should create a draft and skip translations without a title', async () => {
         const token = await createAdminAndLogin();

         const response = await saveNew(
            token,
            baseForm({
               translations: [
                  { language: 'cs', title: 'Jen česky' },
                  { language: 'en', title: '  ' },
               ],
            }),
         );

         expect(response.status).toBe(201);
         expect(response.body.status).toBe('draft');
         expect(response.body.publishedAt).toBeNull();
         expect(response.body.translations.map((t: { language: string }) => t.language)).toEqual([
            'cs',
         ]);
      });

      it.each<[string, number, (fileId: number) => Record<string, unknown>]>([
         ['an unknown tag', 404, () => ({ tagIds: [999999] })],
         ['an unknown media file', 404, () => ({ media: [{ fileId: 999999 }] })],
         ['an unknown thumbnail', 404, () => ({ thumbnailId: 999999 })],
         ['a media row id on a new project', 400, (fileId) => ({ media: [{ id: fileId }] })],
         [
            'no translation with a title',
            400,
            () => ({ translations: [{ language: 'cs', title: '' }] }),
         ],
         ['an end year before the start year', 400, () => ({ startYear: 2024, endYear: 2020 })],
         ['an invalid link', 400, () => ({ links: [{ url: 'javascript:alert(1)' }] })],
      ])('should store nothing for %s', async (_case, status, override) => {
         const token = await createAdminAndLogin();
         const file = await createFile('file');
         const before = await snapshot();

         const response = await saveNew(
            token,
            baseForm({ media: [{ fileId: file.id }], ...override(file.id) }),
         );

         expect(response.status).toBe(status);
         expect(await snapshot()).toEqual(before);
         expect(revalidatedProjects()).toBe(0);
      });

      it('should answer a taken slug with 409 and store nothing', async () => {
         const token = await createAdminAndLogin();
         expect((await saveNew(token, baseForm())).status).toBe(201);
         const before = await snapshot();

         const retry = await saveNew(token, baseForm());

         expect(retry.status).toBe(409);
         expect(retry.body.code).toBe('SLUG_TAKEN');
         expect(await snapshot()).toEqual(before);
      });

      it('should roll back the project when a later write of the transaction fails', async () => {
         const token = await createAdminAndLogin();
         const file = await createFile('file');
         const tag = await createTag('tag');
         await failMediaInserts();
         try {
            const response = await saveNew(
               token,
               baseForm({
                  tagIds: [tag.id],
                  links: [{ url: 'https://example.com' }],
                  media: [{ fileId: file.id }],
               }),
            );

            expect(response.status).toBe(500);
         } finally {
            await restoreMediaInserts();
         }
         expect(await prisma.project.count()).toBe(0);
         expect(await prisma.projectTranslation.count()).toBe(0);
         expect(await prisma.projectTag.count()).toBe(0);
         expect(await prisma.projectLink.count()).toBe(0);
         expect(revalidatedProjects()).toBe(0);
      });
   });

   describe('PUT /projects/:id/save', () => {
      const seedProject = async (token: string) => {
         const [a, b, c, d] = await Promise.all(['a', 'b', 'c', 'd'].map(createFile));
         const tags = await Promise.all(['t1', 't2', 't3'].map(createTag));
         const created = await saveNew(
            token,
            baseForm({
               translations: [
                  { language: 'cs', title: 'Původní', metaTitle: 'Meta' },
                  { language: 'en', title: 'Original' },
               ],
               tagIds: [tags[0].id, tags[1].id],
               links: [{ url: 'https://one.example.com' }, { url: 'https://two.example.com' }],
               media: [{ fileId: a.id, language: 'cs' }, { fileId: b.id }, { fileId: c.id }],
            }),
         );
         expect(created.status).toBe(201);
         revalidate.mockClear();
         return {
            project: created.body as ProjectBody,
            files: { a, b, c, d },
            tags,
         };
      };

      it('should replace tags, links and media in the sent order', async () => {
         const token = await createAdminAndLogin();
         const { project, files, tags } = await seedProject(token);
         const [rowA, , rowC] = project.media;

         const response = await saveExisting(
            token,
            project.id,
            baseForm({
               slug: 'renamed-project',
               company: 'New Co',
               startYear: 2019,
               endYear: 2021,
               translations: [{ language: 'cs', title: 'Nový název', metaTitle: '' }],
               tagIds: [tags[2].id, tags[0].id],
               links: [{ label: 'Only', url: 'https://only.example.com' }],
               media: [
                  { id: rowC.id },
                  { fileId: files.d.id, language: 'en' },
                  { fileId: files.d.id, language: 'en' },
                  { id: rowA.id },
               ],
            }),
         );

         expect(response.status).toBe(200);
         const body = response.body as ProjectBody;
         expect(body.slug).toBe('renamed-project');
         expect([body.company, body.startYear, body.endYear]).toEqual(['New Co', 2019, 2021]);
         expect(body.tags.map((t) => t.tagId)).toEqual([tags[2].id, tags[0].id]);
         expect(body.links.map((l) => [l.label, l.url])).toEqual([
            ['Only', 'https://only.example.com'],
         ]);
         expect(body.media.map((m) => [m.fileId, m.language, m.sortOrder])).toEqual([
            [files.c.id, null, 0],
            [files.d.id, 'en', 1],
            [files.d.id, 'en', 2],
            [files.a.id, 'cs', 3],
         ]);
         expect(body.media[0].id).toBe(rowC.id);
         expect(body.media[3].id).toBe(rowA.id);
         expect(await prisma.projectMedia.count({ where: { fileId: files.b.id } })).toBe(0);

         const translations = await prisma.projectTranslation.findMany({
            where: { projectId: project.id },
            orderBy: { language: 'asc' },
         });
         expect(translations.map((t) => [t.language, t.title, t.metaTitle])).toEqual([
            ['cs', 'Nový název', null],
            ['en', 'Original', null],
         ]);
         expect(body.title).toBe('Nový název');
         expect(revalidatedProjects()).toBe(1);
      });

      it('should leave the same state when the same save is sent again', async () => {
         const token = await createAdminAndLogin();
         const { project, files, tags } = await seedProject(token);
         const form = baseForm({
            tagIds: [tags[1].id],
            links: [{ url: 'https://retry.example.com' }],
            media: [{ id: project.media[1].id }, { fileId: files.d.id, language: 'cs' }],
         });

         const first = await saveExisting(token, project.id, form);
         const second = await saveExisting(token, project.id, form);

         expect(first.status).toBe(200);
         expect(second.status).toBe(200);
         const state = (body: ProjectBody & { updatedAt: string; version: number }) => ({
            ...body,
            updatedAt: undefined,
            version: undefined,
            links: body.links.map(({ label, url }) => ({ label, url })),
            media: body.media.map(({ fileId, language, sortOrder }) => ({
               fileId,
               language,
               sortOrder,
            })),
         });
         expect(state(second.body)).toEqual(state(first.body));
         expect(await prisma.projectMedia.count({ where: { projectId: project.id } })).toBe(2);
      });

      it.each<[string, number, (otherRow: number, ownRow: number) => Record<string, unknown>]>([
         ['an unknown tag', 404, () => ({ tagIds: [999999] })],
         ['an unknown media file', 404, () => ({ media: [{ fileId: 999999 }] })],
         ['a media row of another project', 400, (otherRow) => ({ media: [{ id: otherRow }] })],
         [
            'a media row listed twice',
            400,
            (_otherRow, ownRow) => ({ media: [{ id: ownRow }, { id: ownRow }] }),
         ],
      ])('should change nothing for %s', async (_case, status, override) => {
         const token = await createAdminAndLogin();
         const { project } = await seedProject(token);
         const other = await saveNew(
            token,
            baseForm({ slug: 'other', media: [{ fileId: project.media[0].fileId }] }),
         );
         revalidate.mockClear();
         const before = await snapshot();

         const response = await saveExisting(
            token,
            project.id,
            baseForm({
               tagIds: [],
               links: [],
               ...override(other.body.media[0].id, project.media[0].id),
            }),
         );

         expect(response.status).toBe(status);
         expect(await snapshot()).toEqual(before);
         expect(revalidatedProjects()).toBe(0);
      });

      it("should answer another project's slug with 409 and change nothing", async () => {
         const token = await createAdminAndLogin();
         const { project } = await seedProject(token);
         await saveNew(token, baseForm({ slug: 'taken' }));
         const before = await snapshot();

         const response = await saveExisting(token, project.id, baseForm({ slug: 'taken' }));

         expect(response.status).toBe(409);
         expect(response.body.code).toBe('SLUG_TAKEN');
         expect(await snapshot()).toEqual(before);
      });

      it('should keep its own slug without a conflict', async () => {
         const token = await createAdminAndLogin();
         const { project } = await seedProject(token);

         const response = await saveExisting(token, project.id, baseForm({ slug: project.slug }));

         expect(response.status).toBe(200);
      });

      it('should roll back every write when the media insert fails', async () => {
         const token = await createAdminAndLogin();
         const { project, files, tags } = await seedProject(token);
         const before = await snapshot();
         await failMediaInserts();
         try {
            const response = await saveExisting(
               token,
               project.id,
               baseForm({
                  slug: 'never-stored',
                  translations: [{ language: 'cs', title: 'Nikdy' }],
                  tagIds: [tags[2].id],
                  links: [],
                  media: [{ fileId: files.d.id }],
               }),
            );

            expect(response.status).toBe(500);
         } finally {
            await restoreMediaInserts();
         }
         expect(await snapshot()).toEqual(before);
         expect(revalidatedProjects()).toBe(0);
      });

      it('should wait for the row lock of an overlapping writer, then apply the save', async () => {
         const token = await createAdminAndLogin();
         const { project, tags } = await seedProject(token);
         const lock = await holdRowLock('projects', project.id);

         const save = startRequest(
            saveExisting(token, project.id, baseForm({ company: 'B', tagIds: [tags[2].id] })),
         );
         try {
            await waitForLockWait(prisma);
            expect(save.isSettled()).toBe(false);
            const meanwhile = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
            expect(meanwhile.company).toBeNull();
         } finally {
            await lock.release();
         }

         const response = await save.promise;
         expect(response.status).toBe(200);
         expect(response.body.company).toBe('B');
         expect((response.body as ProjectBody).tags.map((t) => t.tagId)).toEqual([tags[2].id]);
      });

      it('should make a single-part writer (tags) wait for the same row lock', async () => {
         const token = await createAdminAndLogin();
         const { project, tags } = await seedProject(token);
         const lock = await holdRowLock('projects', project.id);

         const assign = startRequest(
            getHttpServer()
               .post(`/projects/${project.id}/tags`)
               .set('Authorization', `Bearer ${token}`)
               .send({ tagIds: [tags[2].id] }),
         );
         try {
            await waitForLockWait(prisma);
            expect(assign.isSettled()).toBe(false);
            expect(await prisma.projectTag.count({ where: { projectId: project.id } })).toBe(2);
         } finally {
            await lock.release();
         }

         const response = await assign.promise;
         expect(response.status).toBe(201);
         expect((response.body as ProjectBody).tags.map((t) => t.tagId)).toEqual([tags[2].id]);
      });

      it('should answer 409 and store nothing when the row lock is not released in time', async () => {
         const token = await createAdminAndLogin();
         const { project } = await seedProject(token);
         const before = await snapshot();
         const lock = await holdRowLock('projects', project.id);

         let response;
         try {
            response = await saveExisting(token, project.id, baseForm({ company: 'Late' }));
         } finally {
            await lock.release();
         }

         expect(response.status).toBe(409);
         expect(response.body.message).toBe(
            'Another change of the same data is in progress. Try again',
         );
         expect(response.body.code).toBe('BUSY');
         expect(await snapshot()).toEqual(before);
      }, 15_000);

      it('should store the titles trimmed, the synced project title too', async () => {
         const token = await createAdminAndLogin();

         const response = await saveNew(
            token,
            baseForm({ translations: [{ language: 'cs', title: '  Ořezaný titulek  ' }] }),
         );

         expect(response.status).toBe(201);
         expect(response.body.title).toBe('Ořezaný titulek');
         expect((response.body as ProjectBody).translations[0].title).toBe('Ořezaný titulek');
      });

      it('should accept rich text above the default 100 kB body limit and keep it out of the audit log', async () => {
         const token = await createAdminAndLogin();
         const { project } = await seedProject(token);
         const content = `<p>${'a'.repeat(500_000)}</p>`;

         const response = await saveExisting(
            token,
            project.id,
            baseForm({ translations: [{ language: 'cs', title: 'Dlouhý', content }] }),
         );

         expect(response.status).toBe(200);
         const czech = response.body.translations.find(
            (translation: { language: string }) => translation.language === 'cs',
         );
         expect(czech.content).toBe(content);
         await new Promise((resolve) => setTimeout(resolve, 200));
         const entry = await prisma.auditLog.findFirstOrThrow({
            where: { action: 'project.save' },
         });
         const body = (entry.metadata as { body: { translations: Record<string, unknown>[] } })
            .body;
         expect(body.translations[0]).toEqual({
            language: 'cs',
            title: 'Dlouhý',
            content: { length: content.length, sha256: expect.stringMatching(/^[0-9a-f]{64}$/) },
         });
      });

      it('should keep the default 100 kB body limit on the routes that are not a save', async () => {
         const token = await createAdminAndLogin();
         const { project } = await seedProject(token);
         const content = `<p>${'a'.repeat(150_000)}</p>`;

         const translation = await getHttpServer()
            .post(`/projects/${project.id}/translations/cs`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Dlouhý', content });
         const contact = await getHttpServer()
            .post('/contact')
            .send({ name: 'a', email: 'a@example.com', message: content });
         const save = await saveExisting(
            token,
            project.id,
            baseForm({ translations: [{ language: 'cs', title: 'Dlouhý', content }] }),
         );

         expect(translation.status).toBe(413);
         expect(contact.status).toBe(413);
         expect(save.status).toBe(200);
      });

      it('should return 404 for a non-existent project', async () => {
         const token = await createAdminAndLogin();

         const response = await saveExisting(token, 999999, baseForm());

         expect(response.status).toBe(404);
      });

      it('should set publishedAt on publish, keep it while published and clear it on draft', async () => {
         const token = await createAdminAndLogin();
         const { project } = await seedProject(token);

         const published = await saveExisting(token, project.id, baseForm({ status: 'published' }));
         const again = await saveExisting(token, project.id, baseForm({ status: 'published' }));
         const untouched = await saveExisting(token, project.id, baseForm());
         const draft = await saveExisting(token, project.id, baseForm({ status: 'draft' }));

         expect(published.body.status).toBe('published');
         expect(published.body.publishedAt).not.toBeNull();
         expect(again.body.publishedAt).toBe(published.body.publishedAt);
         expect(untouched.body.status).toBe('published');
         expect(untouched.body.publishedAt).toBe(published.body.publishedAt);
         expect(draft.body.status).toBe('draft');
         expect(draft.body.publishedAt).toBeNull();
      });
   });

   describe('permissions', () => {
      it('should return 401 without a token', async () => {
         const created = await getHttpServer().post('/projects/save').send(baseForm());
         const saved = await getHttpServer().put('/projects/1/save').send(baseForm());

         expect(created.status).toBe(401);
         expect(saved.status).toBe(401);
      });

      it('should return 403 for a role that may only read projects', async () => {
         const adminToken = await createAdminAndLogin();
         const { body: project } = await saveNew(adminToken, baseForm());
         await prisma.role.create({
            data: {
               name: 'reader',
               permissions: { create: [{ resource: 'projects', action: 'read' }] },
            },
         });
         await createTestUser({ email: 'reader@test.com', role: 'reader' });
         const token = await loginAs('reader@test.com');

         const created = await saveNew(token, baseForm({ slug: 'reader-project' }));
         const saved = await saveExisting(token, project.id, baseForm({ company: 'Reader' }));

         expect(created.status).toBe(403);
         expect(saved.status).toBe(403);
         expect(await prisma.project.count()).toBe(1);
         expect(
            (await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).company,
         ).toBe(null);
      });

      it('should let an editor save but not publish (no publish permission)', async () => {
         await createTestUser({ email: 'editor@test.com', role: 'editor' });
         const token = await loginAs('editor@test.com');

         const created = await saveNew(token, baseForm({ status: 'draft' }));
         const unchanged = await saveExisting(
            token,
            created.body.id,
            baseForm({ status: 'draft' }),
         );
         const publishOnCreate = await saveNew(
            token,
            baseForm({ slug: 'published-by-editor', status: 'published' }),
         );
         const publish = await saveExisting(
            token,
            created.body.id,
            baseForm({ company: 'Editor', status: 'published' }),
         );

         expect(created.status).toBe(201);
         expect(unchanged.status).toBe(200);
         expect(publishOnCreate.status).toBe(403);
         expect(publish.status).toBe(403);
         const stored = await prisma.project.findMany();
         expect(stored).toHaveLength(1);
         expect(stored[0]).toMatchObject({ status: 'draft', company: null });
      });
   });

   describe('OpenAPI', () => {
      const document = () =>
         SwaggerModule.createDocument(getApp(), new DocumentBuilder().build()) as unknown as {
            paths: Record<
               string,
               Record<
                  string,
                  { responses: Record<string, { content?: Record<string, { schema: unknown }> }> }
               >
            >;
         };

      it('should type the responses of the saves and of the preview url', () => {
         const { paths } = document();
         const schemaOf = (path: string, method: string, status: string) =>
            paths[path][method].responses[status].content?.['application/json'].schema;

         expect(schemaOf('/projects/save', 'post', '201')).toEqual({
            $ref: '#/components/schemas/ProjectEntity',
         });
         expect(schemaOf('/projects/{id}/save', 'put', '200')).toEqual({
            $ref: '#/components/schemas/ProjectEntity',
         });
         expect(schemaOf('/projects/{id}/save', 'put', '409')).toEqual({
            $ref: '#/components/schemas/ErrorResponseDto',
         });
         expect(schemaOf('/projects/{id}/preview-url', 'get', '200')).toEqual({
            $ref: '#/components/schemas/ProjectPreviewUrlEntity',
         });
         expect(Object.keys(paths['/projects/{id}/save'].put.responses).sort()).toEqual([
            '200',
            '400',
            '401',
            '403',
            '404',
            '409',
         ]);
      });
   });
});
