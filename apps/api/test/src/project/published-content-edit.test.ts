import { PrismaService } from '../../../src/prisma/prisma.service';
import { AssignProjectTagsTool } from '../../../src/project/tools/assign-project-tags.tool';
import { getApp, getHttpServer } from '../../setup/init';
import { names } from '../../setup/tags';
import { createTestUser, loginAs } from '../../setup/users';

const FORBIDDEN_MESSAGE = 'Changing published content requires the publish permission';

describe('Edits of published content (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.serviceProject.deleteMany();
      await prisma.serviceTranslation.deleteMany();
      await prisma.service.deleteMany();
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

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const loginEditorAndPublisher = async () => {
      await prisma.role.create({
         data: {
            name: 'publisher',
            permissions: {
               create: (['projects', 'services'] as const).flatMap((resource) =>
                  (['read', 'update', 'publish'] as const).map((action) => ({ resource, action })),
               ),
            },
         },
      });
      await createTestUser({ email: 'editor@test.com', role: 'editor' });
      await createTestUser({ email: 'publisher@test.com', role: 'publisher' });
      return {
         editor: await loginAs('editor@test.com'),
         publisher: await loginAs('publisher@test.com'),
      };
   };

   const createProject = (slug: string, status: 'draft' | 'published', sortOrder: number) =>
      prisma.project.create({
         data: {
            title: slug,
            slug,
            status,
            sortOrder,
            ...(status === 'published' && { publishedAt: new Date() }),
            translations: { create: { language: 'cs', title: slug } },
         },
      });

   const createFile = () =>
      prisma.file.create({
         data: {
            filename: 'a.jpg',
            originalName: 'a.jpg',
            mimeType: 'image/jpeg',
            size: 1,
            storagePath: 'projects/a.jpg',
         },
      });

   const saveBody = (slug: string, overrides: Record<string, unknown> = {}) => ({
      slug,
      thumbnailId: null,
      showOnHomepage: false,
      company: 'Changed',
      startYear: null,
      endYear: null,
      translations: [{ language: 'cs', title: 'Changed' }],
      tagIds: [],
      links: [],
      media: [],
      ...overrides,
   });

   const projectEdits = (id: number, slug: string, fileId: number, tagId: number) =>
      [
         ['PUT save', 'put', `/projects/${id}/save`, saveBody(slug, { status: 'published' })],
         ['PATCH', 'patch', `/projects/${id}`, { company: 'Changed' }],
         ['translation', 'post', `/projects/${id}/translations/cs`, { title: 'Changed' }],
         ['media', 'post', `/projects/${id}/media`, { fileId }],
         ['links', 'put', `/projects/${id}/links`, { links: [{ url: 'https://example.com' }] }],
         ['tags', 'post', `/projects/${id}/tags`, { tagIds: [tagId] }],
      ] as const;

   const send = (token: string, method: 'put' | 'patch' | 'post', url: string, body: object) =>
      getHttpServer()[method](url).set('Authorization', `Bearer ${token}`).send(body);

   describe('projects', () => {
      it('should let a role without publish edit a draft through every endpoint', async () => {
         const { editor } = await loginEditorAndPublisher();
         const project = await createProject('draft-project', 'draft', 0);
         const file = await createFile();
         const tag = await prisma.tag.create({ data: { translations: names('t'), slug: 't' } });

         for (const [name, method, url, body] of projectEdits(
            project.id,
            'draft-project',
            file.id,
            tag.id,
         )) {
            const response = await send(editor, method, url, {
               ...body,
               ...(name === 'PUT save' && { status: 'draft' }),
            });
            expect({ name, ok: response.status >= 200 && response.status < 300 }).toEqual({
               name,
               ok: true,
            });
         }
      });

      it('should refuse every edit of a published project without publish and change nothing', async () => {
         const { editor } = await loginEditorAndPublisher();
         const project = await createProject('live-project', 'published', 0);
         const file = await createFile();
         const tag = await prisma.tag.create({ data: { translations: names('t'), slug: 't' } });
         const before = await prisma.project.findUniqueOrThrow({
            where: { id: project.id },
            include: { translations: true, media: true, links: true, tags: true },
         });

         for (const [name, method, url, body] of projectEdits(
            project.id,
            'live-project',
            file.id,
            tag.id,
         )) {
            const response = await send(editor, method, url, body);
            expect({ name, status: response.status, message: response.body.message }).toEqual({
               name,
               status: 403,
               message: FORBIDDEN_MESSAGE,
            });
         }

         const after = await prisma.project.findUniqueOrThrow({
            where: { id: project.id },
            include: { translations: true, media: true, links: true, tags: true },
         });
         expect(after).toEqual(before);
      });

      it('should refuse a save that keeps the stored published status without publish', async () => {
         const { editor } = await loginEditorAndPublisher();
         const project = await createProject('live-project', 'published', 0);

         const response = await send(
            editor,
            'put',
            `/projects/${project.id}/save`,
            saveBody('live-project'),
         );

         expect(response.status).toBe(403);
         expect(
            (await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).company,
         ).toBeNull();
      });

      it('should let a role with publish edit a published project', async () => {
         const { publisher } = await loginEditorAndPublisher();
         const project = await createProject('live-project', 'published', 0);

         const patch = await send(publisher, 'patch', `/projects/${project.id}`, {
            company: 'Live',
         });
         const save = await send(
            publisher,
            'put',
            `/projects/${project.id}/save`,
            saveBody('live-project', { status: 'published' }),
         );

         expect(patch.status).toBe(200);
         expect(save.status).toBe(200);
         expect(save.body.company).toBe('Changed');
      });

      it('should let a role without publish move a draft but not a published project', async () => {
         const { editor } = await loginEditorAndPublisher();
         const live = await createProject('live', 'published', 0);
         const draft = await createProject('draft', 'draft', 1);

         const moveDraft = await send(editor, 'post', `/projects/${draft.id}/move`, {
            targetId: live.id,
            position: 'before',
         });
         const moveLive = await send(editor, 'post', `/projects/${live.id}/move`, {
            targetId: draft.id,
            position: 'before',
         });

         expect(moveDraft.status).toBe(204);
         expect(moveLive.status).toBe(403);
         expect(moveLive.body.message).toBe(FORBIDDEN_MESSAGE);
      });

      it('should apply the rule to the AI tools that share the service', async () => {
         await loginEditorAndPublisher();
         const editorRow = await prisma.user.findUniqueOrThrow({
            where: { email: 'editor@test.com' },
            include: { role: { include: { permissions: true } } },
         });
         const project = await createProject('live-project', 'published', 0);
         const tag = await prisma.tag.create({ data: { translations: names('t'), slug: 't' } });
         const tool = getApp().get(AssignProjectTagsTool);

         await expect(
            tool.execute(
               { user: editorRow, conversationId: 'c' },
               { projectId: project.id, tagIds: [tag.id] },
            ),
         ).rejects.toThrow(FORBIDDEN_MESSAGE);
         expect(await prisma.projectTag.count()).toBe(0);
      });
   });

   describe('services', () => {
      const createService = (slug: string, status: 'draft' | 'published') =>
         prisma.service.create({
            data: {
               title: slug,
               slug,
               status,
               translations: { create: { language: 'cs', title: slug } },
            },
         });

      it('should refuse edits of a published service without publish and allow drafts', async () => {
         const { editor, publisher } = await loginEditorAndPublisher();
         const live = await createService('live', 'published');
         const draft = await createService('draft', 'draft');

         const patchLive = await send(editor, 'patch', `/services/${live.id}`, {
            showOnHomepage: true,
         });
         const translateLive = await send(editor, 'post', `/services/${live.id}/translations/en`, {
            title: 'Live',
         });
         const projectsLive = await send(editor, 'post', `/services/${live.id}/projects`, {
            projectIds: [],
         });
         const patchDraft = await send(editor, 'patch', `/services/${draft.id}`, {
            showOnHomepage: true,
         });
         const patchLiveAsPublisher = await send(publisher, 'patch', `/services/${live.id}`, {
            showOnHomepage: true,
         });

         expect([patchLive.status, translateLive.status, projectsLive.status]).toEqual([
            403, 403, 403,
         ]);
         expect(patchDraft.status).toBe(200);
         expect(patchLiveAsPublisher.status).toBe(200);
         expect(await prisma.serviceTranslation.count({ where: { serviceId: live.id } })).toBe(1);
      });
   });

   describe('tags', () => {
      it('should let a role without publish rename and move any tag, as a tag has no status', async () => {
         const { editor } = await loginEditorAndPublisher();
         const first = await prisma.tag.create({
            data: { translations: names('First'), slug: 'first', sortOrder: 0 },
         });
         const second = await prisma.tag.create({
            data: { translations: names('Second'), slug: 'second', sortOrder: 1 },
         });

         const rename = await send(editor, 'patch', `/tags/${first.id}`, {
            translations: [{ language: 'cs', name: 'Renamed' }],
         });
         const move = await send(editor, 'post', `/tags/${first.id}/move`, {
            targetId: second.id,
            position: 'after',
         });

         expect(rename.status).toBe(200);
         expect(move.status).toBe(204);
         expect(
            (await prisma.tagTranslation.findFirstOrThrow({ where: { tagId: first.id } })).name,
         ).toBe('Renamed');
      });
   });
});
