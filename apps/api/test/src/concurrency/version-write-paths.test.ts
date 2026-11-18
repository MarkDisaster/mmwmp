import { Prisma } from '../../../prisma/generated/prisma/client';
import {
   discoverApiRoutes,
   discoverToolMetadata,
} from '../../../src/ai/tools/__tests__/endpoint-inventory.fixture';
import { adminContext } from '../../../src/ai/tools/__tests__/tool-context.fixture';
import type { AiToolHandler } from '../../../src/ai/tools/ai-tool.decorator';
import type { ToolContext } from '../../../src/ai/tools/tool-auth';
import type { VersionedTable } from '../../../src/common/concurrency/record-version';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { AdminEventsService } from '../../../src/realtime/admin-events.service';
import { createTestJpeg } from '../../setup/files';
import { getApp, getHttpServer } from '../../setup/init';
import { names } from '../../setup/tags';
import { createTestUser, loginAs } from '../../setup/users';

const VERSIONED_PATHS = /^(POST|PUT|PATCH|DELETE) \/(projects|services|tags|files|contact)(\/|$)/;
const VERSIONED_TOOL_DIRS = /^(project|service|tag|file|contact)\//;

const WRITE_ROUTES = discoverApiRoutes()
   .map(({ key }) => key)
   .filter((key) => VERSIONED_PATHS.test(key))
   .sort();

const WRITE_TOOLS = discoverToolMetadata().filter(
   ({ file, meta }) => VERSIONED_TOOL_DIRS.test(file) && meta.behavior !== 'readonly',
);

type Fixture = Awaited<ReturnType<typeof seed>>;

type Method = 'post' | 'put' | 'patch' | 'delete';

type WriteCase = {
   table: VersionedTable;
   id: (f: Fixture) => number;
   prepare?: (f: Fixture) => Promise<unknown>;
};

type RouteCase = WriteCase & { send: (f: Fixture) => [Method, string, object?] };
type ToolCase = WriteCase & { input: (f: Fixture) => object };

const prisma = () => getApp().get(PrismaService);

const seed = async () => {
   const db = prisma();
   const user = await createTestUser();
   const token = await loginAs(user.email);
   const ctx: ToolContext = { ...adminContext(), user: { ...adminContext().user, id: user.id } };

   const file = (name: string) =>
      db.file.create({
         data: {
            filename: name,
            originalName: name,
            mimeType: 'image/png',
            size: 100,
            storagePath: `files/${name}`,
         },
      });
   const [image, mediaFile, otherMediaFile] = await Promise.all([
      file('image.png'),
      file('media.png'),
      file('media-2.png'),
   ]);
   const tag = await db.tag.create({
      data: { slug: 'react', sortOrder: 0, translations: names('React') },
   });
   const otherTag = await db.tag.create({
      data: { slug: 'vue', sortOrder: 1, translations: names('Vue') },
   });
   const project = await db.project.create({
      data: {
         title: 'Alfa',
         slug: 'alfa',
         sortOrder: 0,
         translations: {
            create: [
               { language: 'cs', title: 'Alfa' },
               { language: 'en', title: 'Alpha' },
            ],
         },
         tags: { create: [{ tagId: tag.id, sortOrder: 0 }] },
         media: {
            create: [
               { fileId: mediaFile.id, sortOrder: 0 },
               { fileId: otherMediaFile.id, sortOrder: 1 },
            ],
         },
      },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
   });
   const otherProject = await db.project.create({
      data: {
         title: 'Beta',
         slug: 'beta',
         sortOrder: 1,
         translations: { create: [{ language: 'cs', title: 'Beta' }] },
      },
   });
   const service = await db.service.create({
      data: {
         title: 'Web',
         slug: 'web',
         sortOrder: 0,
         translations: {
            create: [
               { language: 'cs', title: 'Web' },
               { language: 'en', title: 'Web' },
            ],
         },
         projects: { create: [{ projectId: project.id, sortOrder: 0 }] },
      },
   });
   const otherService = await db.service.create({
      data: {
         title: 'Design',
         slug: 'design',
         sortOrder: 1,
         translations: { create: [{ language: 'cs', title: 'Design' }] },
      },
   });
   const contact = await db.contact.create({ data: { vatPayer: false } });
   for (const table of ['projects', 'services', 'tags', 'files', 'contacts'] as const) {
      await db.$executeRaw(Prisma.sql`UPDATE ${Prisma.raw(table)} SET version = 3`);
   }

   return {
      token,
      ctx,
      userId: user.id,
      image,
      tag,
      otherTag,
      project,
      otherProject,
      service,
      otherService,
      contact,
   };
};

const trashProject = (f: Fixture) =>
   prisma().project.update({
      where: { id: f.project.id },
      data: { deletedAt: new Date(), originalSlug: 'alfa', slug: `alfa--trashed-${f.project.id}` },
   });
const trashService = (f: Fixture) =>
   prisma().service.update({
      where: { id: f.service.id },
      data: { deletedAt: new Date(), originalSlug: 'web', slug: `web--trashed-${f.service.id}` },
   });
const trashTag = (f: Fixture) =>
   prisma().tag.update({
      where: { id: f.tag.id },
      data: { deletedAt: new Date(), originalSlug: 'react', slug: `react--trashed-${f.tag.id}` },
   });
const trashImage = (f: Fixture) =>
   prisma().file.update({ where: { id: f.image.id }, data: { deletedAt: new Date() } });

const projectCase = (send: RouteCase['send'], prepare?: WriteCase['prepare']): RouteCase => ({
   table: 'projects',
   id: (f) => f.project.id,
   send,
   prepare,
});
const serviceCase = (send: RouteCase['send'], prepare?: WriteCase['prepare']): RouteCase => ({
   table: 'services',
   id: (f) => f.service.id,
   send,
   prepare,
});

const ROUTE_CASES: Record<string, RouteCase> = {
   'PUT /projects/:id/save': projectCase((f) => [
      'put',
      `/projects/${f.project.id}/save`,
      {
         slug: 'alfa',
         thumbnailId: null,
         showOnHomepage: false,
         company: null,
         startYear: null,
         endYear: null,
         translations: [{ language: 'cs', title: 'Alfa 2' }],
         tagIds: [],
         links: [],
         media: [],
      },
   ]),
   'PATCH /projects/:id': projectCase((f) => [
      'patch',
      `/projects/${f.project.id}`,
      { company: 'ACME' },
   ]),
   'POST /projects/:id/move': projectCase((f) => [
      'post',
      `/projects/${f.project.id}/move`,
      { targetId: f.otherProject.id, position: 'after' },
   ]),
   'PATCH /projects/:id/status': projectCase((f) => [
      'patch',
      `/projects/${f.project.id}/status`,
      { status: 'published' },
   ]),
   'DELETE /projects/:id': projectCase((f) => ['delete', `/projects/${f.project.id}`]),
   'POST /projects/:id/restore': projectCase(
      (f) => ['post', `/projects/${f.project.id}/restore`],
      trashProject,
   ),
   'POST /projects/:id/translations/:language': projectCase((f) => [
      'post',
      `/projects/${f.project.id}/translations/en`,
      { title: 'Alpha 2' },
   ]),
   'DELETE /projects/:id/translations/:language': projectCase((f) => [
      'delete',
      `/projects/${f.project.id}/translations/en`,
   ]),
   'POST /projects/:id/media': projectCase((f) => [
      'post',
      `/projects/${f.project.id}/media`,
      { fileId: f.image.id },
   ]),
   'DELETE /projects/:id/media/:mediaId': projectCase((f) => [
      'delete',
      `/projects/${f.project.id}/media/${f.project.media[0].id}`,
   ]),
   'PUT /projects/:id/media/sort': projectCase((f) => [
      'put',
      `/projects/${f.project.id}/media/sort`,
      { mediaIds: [f.project.media[1].id, f.project.media[0].id] },
   ]),
   'PUT /projects/:id/links': projectCase((f) => [
      'put',
      `/projects/${f.project.id}/links`,
      { links: [{ url: 'https://example.com' }] },
   ]),
   'POST /projects/:id/tags': projectCase((f) => [
      'post',
      `/projects/${f.project.id}/tags`,
      { tagIds: [f.tag.id, f.otherTag.id] },
   ]),
   'PUT /projects/:id/tags/sort': projectCase((f) => [
      'put',
      `/projects/${f.project.id}/tags/sort`,
      { tagIds: [f.tag.id] },
   ]),
   'DELETE /projects/:id/tags/:tagId': projectCase((f) => [
      'delete',
      `/projects/${f.project.id}/tags/${f.tag.id}`,
   ]),

   'PUT /services/:id/save': serviceCase((f) => [
      'put',
      `/services/${f.service.id}/save`,
      {
         slug: 'web',
         showOnHomepage: true,
         translations: [{ language: 'cs', title: 'Web 2' }],
         projectIds: [],
      },
   ]),
   'PATCH /services/:id': serviceCase((f) => [
      'patch',
      `/services/${f.service.id}`,
      { showOnHomepage: true },
   ]),
   'POST /services/:id/move': serviceCase((f) => [
      'post',
      `/services/${f.service.id}/move`,
      { targetId: f.otherService.id, position: 'after' },
   ]),
   'PATCH /services/:id/status': serviceCase((f) => [
      'patch',
      `/services/${f.service.id}/status`,
      { status: 'published' },
   ]),
   'DELETE /services/:id': serviceCase((f) => ['delete', `/services/${f.service.id}`]),
   'POST /services/:id/restore': serviceCase(
      (f) => ['post', `/services/${f.service.id}/restore`],
      trashService,
   ),
   'POST /services/:id/translations/:language': serviceCase((f) => [
      'post',
      `/services/${f.service.id}/translations/en`,
      { title: 'Web 2' },
   ]),
   'DELETE /services/:id/translations/:language': serviceCase((f) => [
      'delete',
      `/services/${f.service.id}/translations/en`,
   ]),
   'POST /services/:id/projects': serviceCase((f) => [
      'post',
      `/services/${f.service.id}/projects`,
      { projectIds: [f.otherProject.id] },
   ]),

   'PATCH /tags/:id': {
      table: 'tags',
      id: (f) => f.tag.id,
      send: (f) => ['patch', `/tags/${f.tag.id}`, { color: '#ff0000' }],
   },
   'POST /tags/:id/move': {
      table: 'tags',
      id: (f) => f.tag.id,
      send: (f) => [
         'post',
         `/tags/${f.tag.id}/move`,
         { targetId: f.otherTag.id, position: 'after' },
      ],
   },
   'DELETE /tags/:id': {
      table: 'tags',
      id: (f) => f.tag.id,
      send: (f) => ['delete', `/tags/${f.tag.id}`],
   },
   'POST /tags/:id/restore': {
      table: 'tags',
      id: (f) => f.tag.id,
      prepare: trashTag,
      send: (f) => ['post', `/tags/${f.tag.id}/restore`],
   },

   'PUT /contact': {
      table: 'contacts',
      id: (f) => f.contact.id,
      send: () => ['put', '/contact', { vatPayer: true }],
   },

   'PATCH /files/:id': {
      table: 'files',
      id: (f) => f.image.id,
      send: (f) => ['patch', `/files/${f.image.id}`, { altText: 'Logo' }],
   },
   'DELETE /files/:id': {
      table: 'files',
      id: (f) => f.image.id,
      send: (f) => ['delete', `/files/${f.image.id}`],
   },
   'POST /files/:id/restore': {
      table: 'files',
      id: (f) => f.image.id,
      prepare: trashImage,
      send: (f) => ['post', `/files/${f.image.id}/restore`],
   },
};

const takesBody = (key: string) => !key.startsWith('DELETE') && !key.endsWith('/restore');

const ROUTES_WITHOUT_RAISE: Record<string, string> = {
   'POST /projects': 'creates the project with version 0',
   'POST /projects/save': 'creates the project with version 0',
   'DELETE /projects/:id/permanent': 'deletes the row',
   'POST /projects/:id/translations/:language/generate': 'returns a draft, writes nothing',
   'POST /services': 'creates the service with version 0',
   'POST /services/save': 'creates the service with version 0',
   'DELETE /services/:id/permanent': 'deletes the row',
   'POST /services/:id/translations/:language/generate': 'returns a draft, writes nothing',
   'POST /tags': 'creates the tag with version 0',
   'DELETE /tags/:id/permanent': 'deletes the row',
   'POST /files': 'an upload creates the file with version 0',
   'DELETE /files/:id/permanent': 'deletes the row',
};

const toolProjectCase = (input: ToolCase['input'], prepare?: WriteCase['prepare']): ToolCase => ({
   table: 'projects',
   id: (f) => f.project.id,
   input,
   prepare,
});
const toolServiceCase = (input: ToolCase['input'], prepare?: WriteCase['prepare']): ToolCase => ({
   table: 'services',
   id: (f) => f.service.id,
   input,
   prepare,
});

const TOOL_CASES: Record<string, ToolCase> = {
   addProjectMedia: toolProjectCase((f) => ({ projectId: f.project.id, fileId: f.image.id })),
   addProjectTag: toolProjectCase((f) => ({ projectId: f.project.id, tagId: f.otherTag.id })),
   addTagToProjects: toolProjectCase((f) => ({
      tagId: f.otherTag.id,
      tagName: 'Vue',
      projects: [{ id: f.project.id, title: 'Alfa' }],
   })),
   assignProjectTags: toolProjectCase((f) => ({
      projectId: f.project.id,
      tagIds: [f.otherTag.id],
   })),
   deleteProjectTranslation: toolProjectCase((f) => ({ projectId: f.project.id, language: 'en' })),
   deleteProject: toolProjectCase((f) => ({ id: f.project.id })),
   moveProject: toolProjectCase((f) => ({
      projectId: f.project.id,
      targetProjectId: f.otherProject.id,
      position: 'after',
   })),
   removeProjectMedia: toolProjectCase((f) => ({
      projectId: f.project.id,
      mediaId: f.project.media[0].id,
   })),
   removeProjectTag: toolProjectCase((f) => ({ projectId: f.project.id, tagId: f.tag.id })),
   removeTagFromProjects: toolProjectCase((f) => ({
      tagId: f.tag.id,
      tagName: 'React',
      projects: [{ id: f.project.id, title: 'Alfa' }],
   })),
   restoreProject: toolProjectCase((f) => ({ id: f.project.id }), trashProject),
   setProjectLinks: toolProjectCase((f) => ({
      projectId: f.project.id,
      links: [{ url: 'https://example.com' }],
   })),
   setProjectThumbnail: toolProjectCase((f) => ({ projectId: f.project.id, fileId: f.image.id })),
   sortProjectMedia: toolProjectCase((f) => ({
      projectId: f.project.id,
      mediaIds: [f.project.media[1].id, f.project.media[0].id],
   })),
   sortProjectTags: toolProjectCase((f) => ({ projectId: f.project.id, tagIds: [f.tag.id] })),
   updateProjectStatus: toolProjectCase((f) => ({ id: f.project.id, status: 'published' })),
   updateProject: toolProjectCase((f) => ({ id: f.project.id, company: 'ACME' })),
   updateProjectsStatus: toolProjectCase((f) => ({
      projects: [{ id: f.project.id, title: 'Alfa' }],
      status: 'published',
   })),
   upsertProjectTranslation: toolProjectCase((f) => ({
      projectId: f.project.id,
      language: 'en',
      title: 'Alpha 2',
   })),

   addServiceProject: toolServiceCase((f) => ({
      serviceId: f.service.id,
      projectId: f.otherProject.id,
   })),
   assignServiceProjects: toolServiceCase((f) => ({
      serviceId: f.service.id,
      projectIds: [f.otherProject.id],
   })),
   deleteServiceTranslation: toolServiceCase((f) => ({ serviceId: f.service.id, language: 'en' })),
   deleteService: toolServiceCase((f) => ({ id: f.service.id })),
   moveService: toolServiceCase((f) => ({
      serviceId: f.service.id,
      targetServiceId: f.otherService.id,
      position: 'after',
   })),
   removeServiceProject: toolServiceCase((f) => ({
      serviceId: f.service.id,
      projectId: f.project.id,
   })),
   restoreService: toolServiceCase((f) => ({ id: f.service.id }), trashService),
   updateServiceStatus: toolServiceCase((f) => ({ id: f.service.id, status: 'published' })),
   updateService: toolServiceCase((f) => ({ id: f.service.id, showOnHomepage: true })),
   upsertServiceTranslation: toolServiceCase((f) => ({
      serviceId: f.service.id,
      language: 'en',
      title: 'Web 2',
   })),

   deleteTag: {
      table: 'tags',
      id: (f) => f.tag.id,
      input: (f) => ({ id: f.tag.id, currentName: 'React' }),
   },
   moveTag: {
      table: 'tags',
      id: (f) => f.tag.id,
      input: (f) => ({ tagId: f.tag.id, targetTagId: f.otherTag.id, position: 'after' }),
   },
   restoreTag: {
      table: 'tags',
      id: (f) => f.tag.id,
      prepare: trashTag,
      input: (f) => ({ id: f.tag.id }),
   },
   updateTag: {
      table: 'tags',
      id: (f) => f.tag.id,
      input: (f) => ({ id: f.tag.id, currentName: 'React', color: '#ff0000' }),
   },

   deleteFile: { table: 'files', id: (f) => f.image.id, input: (f) => ({ id: f.image.id }) },
   deleteFiles: {
      table: 'files',
      id: (f) => f.image.id,
      input: (f) => ({ files: [{ id: f.image.id, name: 'image.png', sizeBytes: 100 }] }),
   },
   restoreFile: {
      table: 'files',
      id: (f) => f.image.id,
      prepare: trashImage,
      input: (f) => ({ id: f.image.id }),
   },
   updateFile: {
      table: 'files',
      id: (f) => f.image.id,
      input: (f) => ({ id: f.image.id, altText: 'Logo' }),
   },
   updateFiles: {
      table: 'files',
      id: (f) => f.image.id,
      input: (f) => ({ files: [{ id: f.image.id, currentName: 'image.png', altText: 'Logo' }] }),
   },

   updateContact: { table: 'contacts', id: (f) => f.contact.id, input: () => ({ vatPayer: true }) },
};

const TOOLS_WITHOUT_RAISE: Record<string, string> = {
   createProject: 'creates the project with version 0',
   createService: 'creates the service with version 0',
   createTag: 'creates the tag with version 0',
   generateProjectTranslation: 'returns a draft (`saved: false`), writes nothing',
   generateServiceTranslation: 'returns a draft (`saved: false`), writes nothing',
};

const versionOf = async (table: VersionedTable, id: number) => {
   const [row] = await prisma().$queryRaw<{ version: number }[]>(
      Prisma.sql`SELECT version FROM ${Prisma.raw(table)} WHERE id = ${id}`,
   );
   return row.version;
};

const EVENT_ENTITY: Record<VersionedTable, string> = {
   projects: 'projects',
   services: 'services',
   tags: 'tags',
   files: 'files',
   contacts: 'contact',
};

const spyOnEvents = () => jest.spyOn(getApp().get(AdminEventsService), 'publish');

const EVENT_OF_ROUTE_WITHOUT_RAISE: Record<
   string,
   { entity: string; action: string; version: number | null } | null
> = {
   'POST /projects': { entity: 'projects', action: 'created', version: 0 },
   'POST /projects/save': { entity: 'projects', action: 'created', version: 0 },
   'DELETE /projects/:id/permanent': { entity: 'projects', action: 'deleted', version: null },
   'POST /projects/:id/translations/:language/generate': null,
   'POST /services': { entity: 'services', action: 'created', version: 0 },
   'POST /services/save': { entity: 'services', action: 'created', version: 0 },
   'DELETE /services/:id/permanent': { entity: 'services', action: 'deleted', version: null },
   'POST /services/:id/translations/:language/generate': null,
   'POST /tags': { entity: 'tags', action: 'created', version: 0 },
   'DELETE /tags/:id/permanent': { entity: 'tags', action: 'deleted', version: null },
   'POST /files': { entity: 'files', action: 'created', version: 0 },
   'DELETE /files/:id/permanent': { entity: 'files', action: 'deleted', version: null },
};

type CreateRequest = (f: Fixture, token: string) => Promise<{ status: number; body: unknown }>;

const post = (url: string, body: object) => (_f: Fixture, token: string) =>
   getHttpServer().post(url).set('Authorization', `Bearer ${token}`).send(body);

const REQUEST_OF_ROUTE_WITHOUT_RAISE: Record<string, CreateRequest> = {
   'POST /projects': post('/projects', { title: 'Nový', slug: 'novy', language: 'cs' }),
   'POST /projects/save': post('/projects/save', {
      slug: 'novy',
      thumbnailId: null,
      showOnHomepage: false,
      company: null,
      startYear: null,
      endYear: null,
      translations: [{ language: 'cs', title: 'Nový' }],
      tagIds: [],
      links: [],
      media: [],
   }),
   'POST /services': post('/services', { title: 'Nová', slug: 'nova', language: 'cs' }),
   'POST /services/save': post('/services/save', {
      slug: 'nova',
      showOnHomepage: false,
      translations: [{ language: 'cs', title: 'Nová' }],
      projectIds: [],
   }),
   'POST /tags': post('/tags', {
      slug: 'nova',
      translations: [{ language: 'cs', name: 'Nová' }],
   }),
   'POST /files': async (_f, token) =>
      getHttpServer()
         .post('/files')
         .set('Authorization', `Bearer ${token}`)
         .attach('file', await createTestJpeg(), {
            filename: 'a.jpg',
            contentType: 'image/jpeg',
         }),
   'DELETE /projects/:id/permanent': async (f, token) => {
      await trashProject(f);
      return getHttpServer()
         .delete(`/projects/${f.project.id}/permanent`)
         .set('Authorization', `Bearer ${token}`);
   },
   'DELETE /services/:id/permanent': async (f, token) => {
      await trashService(f);
      return getHttpServer()
         .delete(`/services/${f.service.id}/permanent`)
         .set('Authorization', `Bearer ${token}`);
   },
   'DELETE /tags/:id/permanent': async (f, token) => {
      await prisma().projectTag.deleteMany();
      await trashTag(f);
      return getHttpServer()
         .delete(`/tags/${f.tag.id}/permanent`)
         .set('Authorization', `Bearer ${token}`);
   },
   'DELETE /files/:id/permanent': async (f, token) => {
      await trashImage(f);
      return getHttpServer()
         .delete(`/files/${f.image.id}/permanent`)
         .set('Authorization', `Bearer ${token}`);
   },
};

const cleanupDb = async () => {
   const db = prisma();
   await db.slugRedirect.deleteMany();
   await db.auditLog.deleteMany();
   await db.serviceProject.deleteMany();
   await db.serviceTranslation.deleteMany();
   await db.service.deleteMany();
   await db.projectMedia.deleteMany();
   await db.projectTag.deleteMany();
   await db.projectLink.deleteMany();
   await db.projectTranslation.deleteMany();
   await db.project.deleteMany();
   await db.fileVariant.deleteMany();
   await db.file.deleteMany();
   await db.tagTranslation.deleteMany();
   await db.tag.deleteMany();
   await db.contactTranslation.deleteMany();
   await db.contact.deleteMany();
   await db.refreshToken.deleteMany();
   await db.auth.deleteMany();
   await db.user.deleteMany();
};

describe('Version raise on every write of a versioned record (e2e)', () => {
   beforeEach(cleanupDb);
   afterEach(() => jest.restoreAllMocks());
   afterAll(cleanupDb);

   it('has a case or a reason for every write route of the versioned records', () => {
      expect(WRITE_ROUTES).toEqual(Object.keys({ ...ROUTE_CASES, ...ROUTES_WITHOUT_RAISE }).sort());
   });

   it('has a case or a reason for every non-reading AI tool of the versioned records', () => {
      expect(WRITE_TOOLS.map(({ meta }) => meta.name).sort()).toEqual(
         Object.keys({ ...TOOL_CASES, ...TOOLS_WITHOUT_RAISE }).sort(),
      );
   });

   it.each(Object.entries(ROUTE_CASES))('%s raises the version by one', async (_key, testCase) => {
      const f = await seed();
      await testCase.prepare?.(f);
      const before = await versionOf(testCase.table, testCase.id(f));

      const [method, url, body] = testCase.send(f);
      const response = await getHttpServer()
         [method](url)
         .set('Authorization', `Bearer ${f.token}`)
         .send(body);

      expect(response.ok ? 'ok' : response.body).toBe('ok');
      expect(await versionOf(testCase.table, testCase.id(f))).toBe(before + 1);
   });

   it.each(Object.entries(ROUTE_CASES).filter(([key]) => takesBody(key)))(
      '%s refuses an older version and writes nothing',
      async (_key, testCase) => {
         const f = await seed();
         await testCase.prepare?.(f);
         const before = await versionOf(testCase.table, testCase.id(f));

         const [method, url, body] = testCase.send(f);
         expect(body).toBeDefined();
         const response = await getHttpServer()
            [method](url)
            .set('Authorization', `Bearer ${f.token}`)
            .send({ ...body, version: before - 1 });

         expect({ status: response.status, body: response.body as unknown }).toMatchObject({
            status: 409,
            body: { code: 'VERSION_CONFLICT', currentVersion: before },
         });
         expect(await versionOf(testCase.table, testCase.id(f))).toBe(before);
      },
   );

   it.each(Object.entries(TOOL_CASES))(
      'tool %s raises the version by one',
      async (name, testCase) => {
         const tool = WRITE_TOOLS.find(({ meta }) => meta.name === name);
         if (!tool) throw new Error(`No tool ${name} on disk`);
         const f = await seed();
         await testCase.prepare?.(f);
         const before = await versionOf(testCase.table, testCase.id(f));

         const result = await getApp()
            .get<unknown, AiToolHandler>(tool.Class)
            .execute(f.ctx, testCase.input(f));

         expect({ result, version: await versionOf(testCase.table, testCase.id(f)) }).toMatchObject(
            {
               version: before + 1,
            },
         );
      },
   );
   it('has an event, or the reason for none, for every route without a version raise', () => {
      expect(Object.keys(EVENT_OF_ROUTE_WITHOUT_RAISE).sort()).toEqual(
         Object.keys(ROUTES_WITHOUT_RAISE).sort(),
      );
      expect(Object.keys(REQUEST_OF_ROUTE_WITHOUT_RAISE).sort()).toEqual(
         Object.entries(EVENT_OF_ROUTE_WITHOUT_RAISE)
            .filter(([, event]) => event !== null)
            .map(([key]) => key)
            .sort(),
      );
   });

   it.each(Object.entries(ROUTE_CASES))(
      '%s publishes an event of the record with its new version',
      async (_key, testCase) => {
         const f = await seed();
         await testCase.prepare?.(f);
         const events = spyOnEvents();

         const [method, url, body] = testCase.send(f);
         const response = await getHttpServer()
            [method](url)
            .set('Authorization', `Bearer ${f.token}`)
            .send(body);

         expect(response.ok ? 'ok' : response.body).toBe('ok');
         const id = testCase.id(f);
         const version = await versionOf(testCase.table, id);
         expect(events).toHaveBeenCalledWith(
            EVENT_ENTITY[testCase.table],
            id,
            expect.any(String),
            version,
         );
      },
   );

   it.each(Object.entries(REQUEST_OF_ROUTE_WITHOUT_RAISE))(
      '%s publishes what it created or deleted',
      async (key, request) => {
         const f = await seed();
         const events = spyOnEvents();

         const response = await request(f, f.token);

         expect(response.status).toBeLessThan(300);
         const expected = EVENT_OF_ROUTE_WITHOUT_RAISE[key];
         expect(events).toHaveBeenCalledTimes(1);
         expect(events).toHaveBeenCalledWith(
            expected?.entity,
            expect.any(Number),
            expected?.action,
            expected?.version,
         );
      },
   );

   it.each(Object.entries(TOOL_CASES))(
      'tool %s publishes an event of the record with its new version',
      async (name, testCase) => {
         const tool = WRITE_TOOLS.find(({ meta }) => meta.name === name);
         if (!tool) throw new Error(`No tool ${name} on disk`);
         const f = await seed();
         await testCase.prepare?.(f);
         const events = spyOnEvents();

         await getApp().get<unknown, AiToolHandler>(tool.Class).execute(f.ctx, testCase.input(f));

         expect(events).toHaveBeenCalledWith(
            EVENT_ENTITY[testCase.table],
            testCase.id(f),
            expect.any(String),
            await versionOf(testCase.table, testCase.id(f)),
         );
      },
   );
});
