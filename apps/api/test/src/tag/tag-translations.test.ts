import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { names, tagBody } from '../../setup/tags';
import { createAdminAndLogin, createTestUser, loginAs } from '../../setup/users';

type Translation = { language: string; name: string };

describe('Tag translations (e2e)', () => {
   let prisma: PrismaService;
   let token: string;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { name: { startsWith: 'tags-' } } });
   };

   beforeEach(async () => {
      await cleanupDb();
      token = await createAdminAndLogin();
   });
   afterAll(cleanupDb);

   const call = (
      method: 'get' | 'post' | 'patch' | 'delete',
      url: string,
      body?: object,
      as: string | null = token,
   ) => {
      const request = getHttpServer()[method](url);
      if (as) request.set('Authorization', `Bearer ${as}`);
      return body ? request.send(body) : request;
   };

   const createTag = async (slug: string, cs: string, en?: string) => {
      const created = await call('post', '/tags', tagBody(slug, cs, en));
      expect(created.status).toBe(201);
      return created.body as { id: number; translations: Translation[] };
   };

   const translationsOf = async (id: number) =>
      (
         await prisma.tagTranslation.findMany({
            where: { tagId: id },
            orderBy: { language: 'asc' },
         })
      ).map(({ language, name }) => ({ language, name }));

   describe('create', () => {
      it('creates a tag with a Czech and an English name', async () => {
         const created = await call(
            'post',
            '/tags',
            tagBody('pripadova-studie', 'Případová studie', 'Case study'),
         );

         expect(created.status).toBe(201);
         expect(created.body).toMatchObject({
            slug: 'pripadova-studie',
            translations: [
               { language: 'cs', name: 'Případová studie' },
               { language: 'en', name: 'Case study' },
            ],
         });
         expect(created.body).not.toHaveProperty('name');
      });

      it('creates a tag with only the Czech name and trims the names', async () => {
         const created = await call('post', '/tags', tagBody('studie', '  Studie  '));

         expect(created.status).toBe(201);
         expect(created.body.translations).toEqual([{ language: 'cs', name: 'Studie' }]);
      });

      it('skips an English name sent empty', async () => {
         const created = await call('post', '/tags', tagBody('studie', 'Studie', '   '));

         expect(created.status).toBe(201);
         expect(created.body.translations).toEqual([{ language: 'cs', name: 'Studie' }]);
      });

      it.each([
         ['no translations', { slug: 'a' }],
         ['an empty list', { slug: 'a', translations: [] }],
         ['only the English name', { slug: 'a', translations: [{ language: 'en', name: 'A' }] }],
         ['an empty Czech name', { slug: 'a', translations: [{ language: 'cs', name: '  ' }] }],
         [
            'a language twice',
            {
               slug: 'a',
               translations: [
                  { language: 'cs', name: 'A' },
                  { language: 'cs', name: 'B' },
               ],
            },
         ],
         ['an unknown language', { slug: 'a', translations: [{ language: 'de', name: 'A' }] }],
         [
            'a too long name',
            { slug: 'a', translations: [{ language: 'cs', name: 'x'.repeat(101) }] },
         ],
         ['the removed `name` field only', { slug: 'a', name: 'A' }],
      ])('answers 400 for %s and creates nothing', async (_label, body) => {
         const response = await call('post', '/tags', body);

         expect(response.status).toBe(400);
         expect(await prisma.tag.count()).toBe(0);
         expect(await prisma.tagTranslation.count()).toBe(0);
      });

      it('lets two tags share a name, the slug is the identity', async () => {
         await createTag('one', 'Studie');
         const second = await call('post', '/tags', tagBody('two', 'Studie'));
         const clash = await call('post', '/tags', tagBody('one', 'Other'));

         expect(second.status).toBe(201);
         expect(clash.status).toBe(409);
      });
   });

   describe('update', () => {
      it('adds an English name, changes the Czech one and removes the English one again', async () => {
         const tag = await createTag('studie', 'Studie');

         const added = await call('patch', `/tags/${tag.id}`, {
            translations: [
               { language: 'cs', name: 'Případová studie' },
               { language: 'en', name: 'Case study' },
            ],
         });
         expect(added.status).toBe(200);
         expect(added.body.translations).toEqual([
            { language: 'cs', name: 'Případová studie' },
            { language: 'en', name: 'Case study' },
         ]);

         const cleared = await call('patch', `/tags/${tag.id}`, {
            translations: [{ language: 'cs', name: 'Případovka' }],
         });
         expect(cleared.status).toBe(200);
         expect(cleared.body.translations).toEqual([{ language: 'cs', name: 'Případovka' }]);
         expect(await translationsOf(tag.id)).toEqual([{ language: 'cs', name: 'Případovka' }]);
      });

      it('removes the English name when it is sent empty', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');

         await call('patch', `/tags/${tag.id}`, {
            translations: [
               { language: 'cs', name: 'Studie' },
               { language: 'en', name: '' },
            ],
         });

         expect(await translationsOf(tag.id)).toEqual([{ language: 'cs', name: 'Studie' }]);
      });

      it('keeps the names when no translations are sent', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');

         const response = await call('patch', `/tags/${tag.id}`, { color: '#fff' });

         expect(response.status).toBe(200);
         expect(response.body.translations).toHaveLength(2);
         expect(await translationsOf(tag.id)).toHaveLength(2);
      });

      it('answers 400 for a set without Czech and changes nothing', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');

         const response = await call('patch', `/tags/${tag.id}`, {
            slug: 'changed',
            translations: [{ language: 'en', name: 'Only English' }],
         });

         expect(response.status).toBe(400);
         expect(await translationsOf(tag.id)).toHaveLength(2);
         expect((await prisma.tag.findUniqueOrThrow({ where: { id: tag.id } })).slug).toBe(
            'studie',
         );
      });

      it('writes nothing of the names when the slug is taken (one transaction)', async () => {
         await createTag('taken', 'Taken');
         const tag = await createTag('studie', 'Studie');

         const response = await call('patch', `/tags/${tag.id}`, {
            slug: 'taken',
            translations: [{ language: 'cs', name: 'Changed' }],
         });

         expect(response.status).toBe(409);
         expect(await translationsOf(tag.id)).toEqual([{ language: 'cs', name: 'Studie' }]);
      });

      it('answers 404 for an unknown or a trashed tag', async () => {
         const tag = await createTag('studie', 'Studie');
         await call('delete', `/tags/${tag.id}`);

         const trashed = await call('patch', `/tags/${tag.id}`, {
            translations: [{ language: 'cs', name: 'X' }],
         });
         const unknown = await call('patch', '/tags/999999', {
            translations: [{ language: 'cs', name: 'X' }],
         });

         expect(trashed.status).toBe(404);
         expect(unknown.status).toBe(404);
         expect(await translationsOf(tag.id)).toEqual([{ language: 'cs', name: 'Studie' }]);
      });
   });

   describe('read', () => {
      it('returns the translations of one tag and of the list', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');

         const one = await call('get', `/tags/${tag.id}`);
         const list = await call('get', '/tags');

         expect(one.body.translations).toEqual([
            { language: 'cs', name: 'Studie' },
            { language: 'en', name: 'Study' },
         ]);
         expect(list.body.data[0].translations).toHaveLength(2);
      });

      it('searches the names in both languages and the slug', async () => {
         await createTag('pripadova-studie', 'Případová studie', 'Case study');
         await createTag('react', 'React');

         const search = async (term: string) =>
            (await call('get', `/tags?search=${encodeURIComponent(term)}`)).body.data.map(
               (tag: { slug: string }) => tag.slug,
            );

         expect(await search('případ')).toEqual(['pripadova-studie']);
         expect(await search('CASE')).toEqual(['pripadova-studie']);
         expect(await search('react')).toEqual(['react']);
         expect(await search('studie')).toEqual(['pripadova-studie']);
         expect(await search('nothing')).toEqual([]);
         const counted = await call('get', '/tags?search=case');
         expect(counted.body.totalCount).toBe(1);
      });

      it('sorts by the Czech name with the Czech collation and pages the sorted list', async () => {
         await createTag('zebra', 'Zebra');
         await createTag('cap', 'Čáp');
         await createTag('car', 'Car', 'AAA first in English');
         await createTag('apple', 'Apple');

         const sorted = async (query: string) =>
            (await call('get', `/tags?sortBy=name&${query}`)).body.data.map(
               (tag: { slug: string }) => tag.slug,
            );

         expect(await sorted('sortOrder=asc')).toEqual(['apple', 'car', 'cap', 'zebra']);
         expect(await sorted('sortOrder=desc')).toEqual(['zebra', 'cap', 'car', 'apple']);
         expect(await sorted('sortOrder=asc&limit=2&page=1')).toEqual(['cap', 'zebra']);
         const counted = await call('get', '/tags?sortBy=name&limit=2');
         expect(counted.body.totalCount).toBe(4);
      });

      it('returns the translations in the public list and nothing else of the names', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');
         const response = await call('get', '/public/tags', undefined, null);

         expect(response.status).toBe(200);
         expect(response.body.data[0]).toMatchObject({
            id: tag.id,
            slug: 'studie',
            translations: [
               { language: 'cs', name: 'Studie' },
               { language: 'en', name: 'Study' },
            ],
            _count: { projects: 0 },
         });
         expect(Object.keys(response.body.data[0].translations[0]).sort()).toEqual([
            'language',
            'name',
         ]);
         for (const column of ['name', 'createdById', 'createdBy', 'deletedAt', 'originalSlug']) {
            expect(response.body.data[0]).not.toHaveProperty(column);
         }
      });

      it('sorts the public list by name', async () => {
         await createTag('b', 'Beta');
         await createTag('a', 'Alfa');

         const response = await call('get', '/public/tags?sortBy=name', undefined, null);

         expect(response.body.data.map((t: { slug: string }) => t.slug)).toEqual(['a', 'b']);
      });
   });

   describe('projects carry the names of their tags', () => {
      const createProjectWithTag = async (tagId: number) => {
         const project = await prisma.project.create({
            data: {
               title: 'P',
               slug: 'p',
               status: 'published',
               translations: { create: { language: 'cs', title: 'P' } },
               tags: { create: { tagId, sortOrder: 0 } },
            },
         });
         return project.id;
      };

      it('returns the translations in the admin and in the public project payloads', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');
         const projectId = await createProjectWithTag(tag.id);
         const expected = [
            { language: 'cs', name: 'Studie' },
            { language: 'en', name: 'Study' },
         ];

         const detail = await call('get', `/projects/${projectId}`);
         const list = await call('get', '/projects');
         const publicDetail = await call('get', '/public/projects/p', undefined, null);
         const publicList = await call('get', '/public/projects', undefined, null);

         expect(detail.body.tags[0].tag.translations).toEqual(expected);
         expect(list.body.data[0].tags[0].tag.translations).toEqual(expected);
         expect(publicDetail.body.tags[0].tag.translations).toEqual(expected);
         expect(publicList.body.data[0].tags[0].tag.translations).toEqual(expected);
         expect(publicDetail.body.tags[0].tag).not.toHaveProperty('name');
         expect(publicDetail.body.tags[0].tag).not.toHaveProperty('createdById');
      });

      it('shows a changed name on the public project at once (the cached payload is dropped)', async () => {
         const tag = await createTag('studie', 'Studie');
         await createProjectWithTag(tag.id);
         const before = await call('get', '/public/projects/p', undefined, null);
         expect(before.body.tags[0].tag.translations).toEqual([{ language: 'cs', name: 'Studie' }]);

         await call('patch', `/tags/${tag.id}`, {
            translations: [
               { language: 'cs', name: 'Případová studie' },
               { language: 'en', name: 'Case study' },
            ],
         });

         const after = await call('get', '/public/projects/p', undefined, null);
         expect(after.body.tags[0].tag.translations).toEqual([
            { language: 'cs', name: 'Případová studie' },
            { language: 'en', name: 'Case study' },
         ]);
      });
   });

   describe('trash keeps the names', () => {
      it('restores a trashed tag with both names', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');
         await call('delete', `/tags/${tag.id}`);

         expect(await translationsOf(tag.id)).toHaveLength(2);
         const trash = await call('get', '/tags/trash');
         expect(trash.body.data[0]).toMatchObject({ id: tag.id, title: 'Studie' });

         const restored = await call('post', `/tags/${tag.id}/restore`);

         expect(restored.status).toBe(200);
         expect(restored.body.translations).toHaveLength(2);
         expect(restored.body.slug).toBe('studie');
      });

      it('deletes the names with a tag deleted for good', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');
         await call('delete', `/tags/${tag.id}`);

         expect((await call('delete', `/tags/${tag.id}/permanent`)).status).toBe(204);

         expect(await prisma.tagTranslation.count()).toBe(0);
      });
   });

   describe('audit log', () => {
      it('records the tag actions with the id and the Czech name, and no author data', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');
         await call('patch', `/tags/${tag.id}`, { color: '#fff' });
         await call('delete', `/tags/${tag.id}`);
         await call('post', `/tags/${tag.id}/restore`);
         await call('delete', `/tags/${tag.id}`);
         await call('delete', `/tags/${tag.id}/permanent`);

         const findRows = () =>
            prisma.auditLog.findMany({ where: { resourceType: 'tag' }, orderBy: { id: 'asc' } });
         let rows = await findRows();
         for (let attempt = 0; attempt < 40 && rows.length < 6; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            rows = await findRows();
         }

         expect(rows.map((row) => row.action)).toEqual([
            'tag.create',
            'tag.update',
            'tag.trash',
            'tag.restore',
            'tag.trash',
            'tag.deletePermanently',
         ]);
         for (const row of rows) expect(row.resourceId).toBe(String(tag.id));
         expect(rows[0]?.metadata).toMatchObject({ resourceName: 'Studie' });
         expect(JSON.stringify(rows)).not.toContain('admin@test.com');
      });
   });

   describe('permissions', () => {
      const grantsFor = async (name: string, actions: string[]) => {
         await prisma.role.create({
            data: {
               name,
               permissions: {
                  create: actions.map((action) => ({
                     resource: 'tags' as const,
                     action: action as 'read',
                  })),
               },
            },
         });
         await createTestUser({ email: `${name}@test.com`, role: name });
         return loginAs(`${name}@test.com`);
      };

      const ROUTES = (id: number, trashedId: number) => ({
         create: () => call('post', '/tags', tagBody('new', 'New')),
         updateNames: (as: string | null) =>
            call(
               'patch',
               `/tags/${id}`,
               { translations: [{ language: 'cs', name: 'Changed' }] },
               as,
            ),
         trash: (as: string | null) => call('delete', `/tags/${id}`, undefined, as),
         restore: (as: string | null) => call('post', `/tags/${trashedId}/restore`, undefined, as),
         permanent: (as: string | null) =>
            call('delete', `/tags/${trashedId}/permanent`, undefined, as),
      });

      it('answers 401 without a token', async () => {
         const tag = await createTag('studie', 'Studie');

         expect((await call('post', '/tags', tagBody('x', 'X'), null)).status).toBe(401);
         expect((await call('get', '/tags', undefined, null)).status).toBe(401);
         expect((await call('get', `/tags/${tag.id}`, undefined, null)).status).toBe(401);
         const routes = ROUTES(tag.id, tag.id);
         expect((await routes.updateNames(null)).status).toBe(401);
         expect((await routes.trash(null)).status).toBe(401);
         expect((await routes.restore(null)).status).toBe(401);
         expect((await routes.permanent(null)).status).toBe(401);
      });

      it('lets a read-only role read the names and nothing more', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');
         const trashed = await createTag('old', 'Old');
         await call('delete', `/tags/${trashed.id}`);
         const reader = await grantsFor('tags-reader', ['read']);
         const routes = ROUTES(tag.id, trashed.id);

         const one = await call('get', `/tags/${tag.id}`, undefined, reader);
         expect(one.status).toBe(200);
         expect(one.body.translations).toHaveLength(2);
         expect((await call('get', '/tags', undefined, reader)).status).toBe(200);
         expect((await call('post', '/tags', tagBody('new', 'New'), reader)).status).toBe(403);
         expect((await routes.updateNames(reader)).status).toBe(403);
         expect((await routes.trash(reader)).status).toBe(403);
         expect((await routes.restore(reader)).status).toBe(403);
         expect((await routes.permanent(reader)).status).toBe(403);
         expect((await call('get', '/tags/trash', undefined, reader)).status).toBe(403);
         expect(await translationsOf(tag.id)).toHaveLength(2);
      });

      it('needs tags.create to create and tags.update to change the names', async () => {
         const tag = await createTag('studie', 'Studie', 'Study');
         const creator = await grantsFor('tags-creator', ['create']);
         const updater = await grantsFor('tags-updater', ['update']);
         const routes = ROUTES(tag.id, tag.id);

         expect((await call('post', '/tags', tagBody('new', 'New'), creator)).status).toBe(201);
         expect((await call('post', '/tags', tagBody('new2', 'New 2'), updater)).status).toBe(403);
         expect((await routes.updateNames(creator)).status).toBe(403);
         expect(await translationsOf(tag.id)).toHaveLength(2);

         const changed = await routes.updateNames(updater);
         expect(changed.status).toBe(200);
         expect(await translationsOf(tag.id)).toEqual([{ language: 'cs', name: 'Changed' }]);
         expect((await routes.trash(updater)).status).toBe(403);
      });

      it('needs tags.delete to trash, restore and delete for good, and not more', async () => {
         const tag = await createTag('studie', 'Studie');
         const remover = await grantsFor('tags-remover', ['delete']);
         const routes = ROUTES(tag.id, tag.id);

         expect((await routes.updateNames(remover)).status).toBe(403);
         expect((await call('post', '/tags', tagBody('new', 'New'), remover)).status).toBe(403);
         expect((await routes.trash(remover)).status).toBe(204);
         expect((await call('get', '/tags/trash', undefined, remover)).status).toBe(200);
         expect((await routes.restore(remover)).status).toBe(200);
         expect((await routes.trash(remover)).status).toBe(204);
         expect((await routes.permanent(remover)).status).toBe(204);
      });

      it('keeps the tag permissions of the system roles: editor has no delete', async () => {
         const permissions = await prisma.rolePermission.findMany({
            where: { resource: 'tags', role: { name: 'editor' } },
         });

         expect(permissions.map((p) => p.action).sort()).toEqual(['create', 'read', 'update']);
      });
   });

   describe('prisma level', () => {
      it('removes the translations with the tag (cascade)', async () => {
         const tag = await prisma.tag.create({
            data: { slug: 'direct', translations: names('Direct', 'Direct EN') },
         });

         await prisma.tag.delete({ where: { id: tag.id } });

         expect(await prisma.tagTranslation.count()).toBe(0);
      });

      it('does not allow two names of one language for a tag', async () => {
         const tag = await prisma.tag.create({
            data: { slug: 'direct', translations: names('Direct') },
         });

         await expect(
            prisma.tagTranslation.create({
               data: { tagId: tag.id, language: 'cs', name: 'Other' },
            }),
         ).rejects.toThrow();
      });
   });
});
