import { FileService } from '../../../src/file/file.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { TrashPurgeService } from '../../../src/trash/trash-purge.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createProject, setProjectStatus } from '../../setup/projects';
import { tagBody } from '../../setup/tags';
import { createAdminAndLogin, createTestUser, loginAs } from '../../setup/users';

const DAY = 86_400_000;

describe('Trash (e2e)', () => {
   let prisma: PrismaService;
   let token: string;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.slugRedirect.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.serviceProject.deleteMany();
      await prisma.serviceTranslation.deleteMany();
      await prisma.service.deleteMany();
      await prisma.projectMedia.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.projectLink.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.fileVariant.deleteMany();
      await prisma.file.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(async () => {
      await cleanupDb();
      token = await createAdminAndLogin();
   });
   afterAll(cleanupDb);

   const api = {
      get: (url: string, as = token) =>
         getHttpServer().get(url).set('Authorization', `Bearer ${as}`),
      post: (url: string, body: object = {}, as = token) =>
         getHttpServer().post(url).set('Authorization', `Bearer ${as}`).send(body),
      patch: (url: string, body: object, as = token) =>
         getHttpServer().patch(url).set('Authorization', `Bearer ${as}`).send(body),
      del: (url: string, as = token) =>
         getHttpServer().delete(url).set('Authorization', `Bearer ${as}`),
   };

   const createPublishedProject = async (slug: string) => {
      const project = await createProject(token, { slug });
      await setProjectStatus(token, project.id, 'published');
      return project;
   };

   const createService = async (slug: string, publish = false) => {
      const created = await api.post('/services', { title: slug, slug, language: 'cs' });
      expect(created.status).toBe(201);
      if (publish) {
         await api
            .patch(`/services/${created.body.id}/status`, { status: 'published' })
            .expect(200)
            .expect(200);
      }
      return created.body as { id: number; slug: string };
   };

   const createTag = async (name: string, slug: string, en?: string) => {
      const created = await api.post('/tags', tagBody(slug, name, en));
      expect(created.status).toBe(201);
      return created.body as { id: number };
   };

   const createFile = (name: string) =>
      prisma.file.create({
         data: {
            filename: name,
            originalName: name,
            mimeType: 'image/jpeg',
            size: 10,
            storagePath: `projects/${name}`,
         },
      });

   describe('projects', () => {
      it('moves a project out of every list, count and public endpoint', async () => {
         const keep = await createPublishedProject('keep');
         const gone = await createPublishedProject('gone');
         expect((await api.get('/public/projects')).body.totalCount).toBe(2);

         expect((await api.del(`/projects/${gone.id}`)).status).toBe(204);

         const list = await api.get('/projects');
         expect(list.body.totalCount).toBe(1);
         expect(list.body.data.map((p: { id: number }) => p.id)).toEqual([keep.id]);
         expect((await api.get(`/projects?search=gone`)).body.totalCount).toBe(0);
         expect((await api.get(`/projects/${gone.id}`)).status).toBe(404);
         expect((await api.get(`/projects/${gone.id}/preview-url`)).status).toBe(404);

         const publicList = await api.get('/public/projects');
         expect(publicList.body.totalCount).toBe(1);
         expect((await getHttpServer().get('/public/projects/gone')).status).toBe(404);
         const preview = await getHttpServer()
            .get('/public/projects/gone')
            .set('Authorization', `Bearer ${process.env.PREVIEW_API_TOKEN}`);
         expect(preview.status).toBe(404);
         expect(
            (await getHttpServer().get('/public/projects?homepageOnly=true')).body.totalCount,
         ).toBe(0);
      });

      it('lists the trash with the original slug, who deleted it and the days left', async () => {
         const project = await createProject(token, { slug: 'listed' });
         await api.del(`/projects/${project.id}`).expect(204);

         const trash = await api.get('/projects/trash');

         expect(trash.status).toBe(200);
         expect(trash.body.totalCount).toBe(1);
         expect(trash.body.data[0]).toMatchObject({
            id: project.id,
            title: 'listed',
            originalSlug: 'listed',
            daysLeft: 30,
            deletedBy: { firstName: 'Test' },
         });
         expect((await api.get('/projects/trash?search=zzz')).body.totalCount).toBe(0);
         expect((await api.get('/projects/trash?search=list')).body.totalCount).toBe(1);
      });

      it('moves a published project to the trash as a draft and restores it as a draft', async () => {
         const project = await createPublishedProject('was-live');
         await api.del(`/projects/${project.id}`).expect(204);
         expect(
            (await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status,
         ).toBe('draft');

         const restored = await api.post(`/projects/${project.id}/restore`);

         expect(restored.status).toBe(200);
         expect(restored.body).toMatchObject({
            id: project.id,
            slug: 'was-live',
            status: 'draft',
            publishedAt: null,
         });
         expect((await api.get('/projects')).body.totalCount).toBe(1);
         expect((await getHttpServer().get('/public/projects/was-live')).status).toBe(404);
         expect((await api.get('/projects/trash')).body.totalCount).toBe(0);
      });

      it('frees the slug on trash and answers 409 on restore while another project has it', async () => {
         const original = await createProject(token, { slug: 'taken' });
         await api.del(`/projects/${original.id}`).expect(204);
         const stored = await prisma.project.findUniqueOrThrow({ where: { id: original.id } });
         expect(stored.slug).toBe(`taken--trashed-${original.id}`);
         expect(stored.originalSlug).toBe('taken');

         const replacement = await createProject(token, { slug: 'taken' });
         const conflict = await api.post(`/projects/${original.id}/restore`);
         expect(conflict.status).toBe(409);
         expect(conflict.body.message).toContain('taken');
         expect(
            (await prisma.project.findUniqueOrThrow({ where: { id: original.id } })).deletedAt,
         ).not.toBeNull();

         await api.del(`/projects/${replacement.id}`).expect(204);
         expect((await api.post(`/projects/${original.id}/restore`)).status).toBe(200);
         expect((await api.post(`/projects/${replacement.id}/restore`)).status).toBe(409);
      });

      it('answers 404 for a trash operation on the wrong state', async () => {
         const live = await createProject(token, { slug: 'live' });
         expect((await api.post(`/projects/${live.id}/restore`)).status).toBe(404);
         expect((await api.del(`/projects/${live.id}/permanent`)).status).toBe(404);
         await api.del(`/projects/${live.id}`).expect(204);
         expect((await api.del(`/projects/${live.id}`)).status).toBe(404);
         expect((await api.patch(`/projects/${live.id}`, { company: 'x' })).status).toBe(404);
      });

      it('deletes a trashed project for good with its translations, links and media', async () => {
         const project = await createProject(token, { slug: 'perm' });
         const file = await createFile('perm.jpg');
         await api
            .post(`/projects/${project.id}/media`, { fileId: file.id })
            .expect(201)
            .expect(201);
         expect(await prisma.projectMedia.count()).toBe(1);
         await api.del(`/projects/${project.id}`).expect(204).expect(204);

         expect((await api.del(`/projects/${project.id}/permanent`)).status).toBe(204);

         expect(await prisma.project.count()).toBe(0);
         expect(await prisma.projectTranslation.count()).toBe(0);
         expect(await prisma.projectMedia.count()).toBe(0);
      });

      it('keeps the links of a trashed project to a service and gives them back on restore', async () => {
         const project = await createPublishedProject('linked');
         const service = await createService('with-link', true);
         await api
            .post(`/services/${service.id}/projects`, { projectIds: [project.id] })
            .expect(201);
         expect((await api.get(`/services/${service.id}`)).body.projects).toHaveLength(1);

         await api.del(`/projects/${project.id}`).expect(204);

         expect((await api.get(`/services/${service.id}`)).body.projects).toHaveLength(0);
         expect((await api.get('/services')).body.data[0].projects).toHaveLength(0);
         const publicService = await getHttpServer().get('/public/services/with-link');
         expect(publicService.body.projects).toHaveLength(0);
         expect(await prisma.serviceProject.count()).toBe(1);

         expect(
            (await api.post(`/services/${service.id}/projects`, { projectIds: [project.id] }))
               .status,
         ).toBe(404);

         await api.post(`/projects/${project.id}/restore`).expect(200);
         expect((await api.get(`/services/${service.id}`)).body.projects).toHaveLength(1);
      });
   });

   describe('slug redirects', () => {
      it('a trashed project answers no redirect; a restored draft none until it is published again', async () => {
         const project = await createPublishedProject('old-address');
         await api.patch(`/projects/${project.id}`, { slug: 'new-address' }).expect(200);
         expect((await getHttpServer().get('/public/projects/redirect/old-address')).status).toBe(
            200,
         );

         await api.del(`/projects/${project.id}`).expect(204);
         expect((await getHttpServer().get('/public/projects/redirect/old-address')).status).toBe(
            404,
         );
         expect(await prisma.slugRedirect.count({ where: { oldSlug: 'new-address' } })).toBe(0);

         await api.post(`/projects/${project.id}/restore`).expect(200);
         expect((await getHttpServer().get('/public/projects/redirect/old-address')).status).toBe(
            404,
         );
         await api.patch(`/projects/${project.id}/status`, { status: 'published' }).expect(200);
         expect((await getHttpServer().get('/public/projects/redirect/old-address')).body).toEqual({
            slug: 'new-address',
         });
      });

      it('deletes the redirects of a project deleted for good', async () => {
         const project = await createPublishedProject('before');
         await api.patch(`/projects/${project.id}`, { slug: 'after' }).expect(200).expect(200);
         expect(await prisma.slugRedirect.count()).toBe(1);
         await api.del(`/projects/${project.id}`).expect(204).expect(204);
         await api.del(`/projects/${project.id}/permanent`).expect(204).expect(204);

         expect(await prisma.slugRedirect.count()).toBe(0);
      });
   });

   describe('services', () => {
      it('hides a trashed service everywhere, frees its slug and restores it as a draft', async () => {
         const service = await createService('svc', true);
         expect((await getHttpServer().get('/public/services')).body.totalCount).toBe(1);

         expect((await api.del(`/services/${service.id}`)).status).toBe(204);

         expect((await api.get('/services')).body.totalCount).toBe(0);
         expect((await api.get(`/services/${service.id}`)).status).toBe(404);
         expect((await getHttpServer().get('/public/services')).body.totalCount).toBe(0);
         expect((await getHttpServer().get('/public/services/svc')).status).toBe(404);
         expect((await api.get('/services/trash')).body.data[0]).toMatchObject({
            id: service.id,
            originalSlug: 'svc',
            daysLeft: 30,
         });
         expect((await createService('svc')).slug).toBe('svc');

         expect((await api.post(`/services/${service.id}/restore`)).status).toBe(409);
      });

      it('restores a service as a draft and deletes one for good', async () => {
         const restoredOne = await createService('restore-me', true);
         const goneOne = await createService('gone-for-good');
         await api.del(`/services/${restoredOne.id}`).expect(204);
         await api.del(`/services/${goneOne.id}`).expect(204);

         const restored = await api.post(`/services/${restoredOne.id}/restore`);
         expect(restored.body).toMatchObject({ slug: 'restore-me', status: 'draft' });
         expect((await api.del(`/services/${goneOne.id}/permanent`)).status).toBe(204);
         expect(await prisma.service.count()).toBe(1);
      });
   });

   describe('tags', () => {
      it('hides a trashed tag from lists, projects and public endpoints but keeps the links', async () => {
         const project = await createPublishedProject('tagged');
         const tag = await createTag('Branding', 'branding', 'Branding EN');
         await api.post(`/projects/${project.id}/tags`, { tagIds: [tag.id] }).expect(201);
         expect((await getHttpServer().get('/public/tags')).body.data[0]._count.projects).toBe(1);
         expect((await getHttpServer().get('/public/projects/tagged')).body.tags).toHaveLength(1);

         expect((await api.del(`/tags/${tag.id}`)).status).toBe(204);

         expect((await api.get('/tags')).body.totalCount).toBe(0);
         expect((await api.get(`/tags/${tag.id}`)).status).toBe(404);
         expect((await api.get(`/projects/${project.id}`)).body.tags).toHaveLength(0);
         expect((await api.get('/projects')).body.data[0].tags).toHaveLength(0);
         expect((await getHttpServer().get('/public/tags')).body.totalCount).toBe(0);
         expect((await getHttpServer().get('/public/projects/tagged')).body.tags).toHaveLength(0);
         expect(await prisma.projectTag.count()).toBe(1);
         expect((await api.post(`/projects/${project.id}/tags`, { tagIds: [tag.id] })).status).toBe(
            404,
         );

         const restored = await api.post(`/tags/${tag.id}/restore`);
         expect(restored.status).toBe(200);
         expect(restored.body).toMatchObject({
            slug: 'branding',
            translations: [
               { language: 'cs', name: 'Branding' },
               { language: 'en', name: 'Branding EN' },
            ],
         });
         expect((await api.get(`/projects/${project.id}`)).body.tags).toHaveLength(1);
      });

      it('keeps the hidden link when a project saves its tags meanwhile', async () => {
         const project = await createProject(token, { slug: 'keeps-hidden' });
         const trashed = await createTag('Old', 'old');
         const other = await createTag('New', 'new');
         await api.post(`/projects/${project.id}/tags`, { tagIds: [trashed.id] }).expect(201);
         await api.del(`/tags/${trashed.id}`).expect(204);

         await api.post(`/projects/${project.id}/tags`, { tagIds: [other.id] }).expect(201);
         await api.post(`/tags/${trashed.id}/restore`).expect(200);

         const tags = (await api.get(`/projects/${project.id}`)).body.tags;
         expect(tags.map((t: { tag: { id: number } }) => t.tag.id).sort()).toEqual(
            [trashed.id, other.id].sort(),
         );
      });

      it('frees the slug and answers 409 on restore while it is taken; a shared name does not matter', async () => {
         const tag = await createTag('Same', 'same');
         await api.del(`/tags/${tag.id}`).expect(204);

         await createTag('Same', 'other-slug');
         expect((await api.post(`/tags/${tag.id}/restore`)).status).toBe(200);
         await api.del(`/tags/${tag.id}`).expect(204);

         await createTag('Different', 'same');
         expect((await api.post(`/tags/${tag.id}/restore`)).status).toBe(409);
         const stored = await prisma.tag.findUniqueOrThrow({ where: { id: tag.id } });
         expect(stored.originalSlug).toBe('same');
         expect(stored.slug).toBe(`same--trashed-${tag.id}`);
      });

      it('lists a trashed tag by its Czech name, sorts and searches the trash by name', async () => {
         const zebra = await createTag('Zebra', 'zebra', 'Zebra EN');
         const car = await createTag('Čáp', 'cap');
         const apple = await createTag('Apple', 'apple');
         for (const tag of [zebra, car, apple]) await api.del(`/tags/${tag.id}`);

         const byName = await api.get('/tags/trash?sortBy=title&sortOrder=asc');
         expect(byName.body.data.map((row: { title: string }) => row.title)).toEqual([
            'Apple',
            'Čáp',
            'Zebra',
         ]);
         const searched = await api.get('/tags/trash?search=zebra%20en');
         expect(searched.body.data.map((row: { title: string }) => row.title)).toEqual(['Zebra']);
         expect(searched.body.totalCount).toBe(1);
      });

      it('deletes a trashed tag for good and detaches it from its projects', async () => {
         const project = await createProject(token, { slug: 'p-tag' });
         const tag = await createTag('Gone', 'gone');
         await api
            .post(`/projects/${project.id}/tags`, { tagIds: [tag.id] })
            .expect(201)
            .expect(201);
         expect(await prisma.projectTag.count()).toBe(1);
         await api.del(`/tags/${tag.id}`).expect(204).expect(204);

         expect((await api.del(`/tags/${tag.id}/permanent`)).status).toBe(204);

         expect(await prisma.tag.count()).toBe(0);
         expect(await prisma.projectTag.count()).toBe(0);
      });
   });

   describe('files', () => {
      it('hides a trashed file from the library, keeps the project reference and hides it publicly', async () => {
         const project = await createPublishedProject('with-file');
         const file = await createFile('hero.jpg');
         await prisma.project.update({ where: { id: project.id }, data: { thumbnailId: file.id } });
         await api.post(`/projects/${project.id}/media`, { fileId: file.id }).expect(201);
         expect((await getHttpServer().get('/public/projects/with-file')).body.media).toHaveLength(
            1,
         );

         expect((await api.del(`/files/${file.id}`)).status).toBe(204);

         expect((await api.get('/files')).body.totalCount).toBe(0);
         expect((await api.get(`/files/${file.id}`)).status).toBe(404);
         const detail = (await api.get(`/projects/${project.id}`)).body;
         expect(detail.thumbnail.deletedAt).not.toBeNull();
         expect(detail.media[0].file.deletedAt).not.toBeNull();
         const pub = (await getHttpServer().get('/public/projects/with-file')).body;
         expect(pub.thumbnail).toBeNull();
         expect(pub.media).toHaveLength(0);
         expect((await api.post(`/projects/${project.id}/media`, { fileId: file.id })).status).toBe(
            404,
         );
         expect((await api.get('/files/trash')).body.data[0]).toMatchObject({
            id: file.id,
            title: 'hero.jpg',
            daysLeft: 30,
         });

         expect((await api.post(`/files/${file.id}/restore`)).status).toBe(200);
         expect((await getHttpServer().get('/public/projects/with-file')).body.media).toHaveLength(
            1,
         );
         expect((await api.get('/files')).body.totalCount).toBe(1);
      });

      it('refuses the permanent delete with 409 while a project uses the file', async () => {
         const project = await createProject(token, { slug: 'uses-file' });
         const file = await createFile('used.jpg');
         await api.post(`/projects/${project.id}/media`, { fileId: file.id }).expect(201);
         await api.del(`/files/${file.id}`).expect(204);

         expect((await api.del(`/files/${file.id}/permanent`)).status).toBe(409);
         expect(await prisma.file.count({ where: { id: file.id } })).toBe(1);

         await api.del(`/projects/${project.id}`).expect(204);
         await api.del(`/projects/${project.id}/permanent`).expect(204);
         expect((await api.del(`/files/${file.id}/permanent`)).status).toBe(204);
         expect(await prisma.file.count()).toBe(0);
      });

      it('refuses to delete for good a file that is the thumbnail of a live or a trashed project', async () => {
         const live = await createProject(token, { slug: 'thumb-live' });
         const trashed = await createProject(token, { slug: 'thumb-trashed' });
         const file = await createFile('thumb.jpg');
         await prisma.project.updateMany({
            where: { id: { in: [live.id, trashed.id] } },
            data: { thumbnailId: file.id },
         });
         await api.del(`/projects/${trashed.id}`).expect(204);
         await api.del(`/files/${file.id}`).expect(204);

         expect((await api.del(`/files/${file.id}/permanent`)).status).toBe(409);
         expect(await prisma.project.count({ where: { thumbnailId: file.id } })).toBe(2);
         expect(await prisma.file.count({ where: { id: file.id } })).toBe(1);

         await prisma.project.update({ where: { id: live.id }, data: { thumbnailId: null } });
         expect((await api.del(`/files/${file.id}/permanent`)).status).toBe(409);
         await prisma.file.update({
            where: { id: file.id },
            data: { deletedAt: new Date(Date.now() - 31 * DAY) },
         });
         const result = await getApp().get(TrashPurgeService).purgeExpired();
         expect(result).toMatchObject({ skipped: 1 });
         expect(await prisma.project.count({ where: { thumbnailId: file.id } })).toBe(1);
         expect(await prisma.file.count()).toBe(1);
      });

      it('does not delete a file restored while the permanent delete waits for its lock', async () => {
         const file = await createFile('race.jpg');
         await api.del(`/files/${file.id}`).expect(204);
         const files = getApp().get(FileService);
         let removal: Promise<unknown> = Promise.resolve();

         await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM files WHERE id = ${file.id} FOR UPDATE`;
            removal = files.removePermanently(file.id).catch((error: Error) => error);
            await new Promise((resolve) => setTimeout(resolve, 500));
            await tx.file.update({ where: { id: file.id }, data: { deletedAt: null } });
         });

         expect(await removal).toMatchObject({ status: 404 });
         expect(await prisma.file.count({ where: { id: file.id } })).toBe(1);
      });

      it('needs the publish permission to trash a file that a published project shows', async () => {
         const project = await createPublishedProject('published-file');
         const file = await createFile('pub.jpg');
         await api.post(`/projects/${project.id}/media`, { fileId: file.id }).expect(201);
         await createTestUser({ email: 'manager@test.com', role: 'editor' });
         const role = await prisma.role.create({
            data: {
               name: 'files-deleter',
               permissions: {
                  create: [
                     { resource: 'files', action: 'delete' },
                     { resource: 'files', action: 'read' },
                  ],
               },
            },
         });
         await createTestUser({ email: 'deleter@test.com', role: role.name });
         const deleter = await loginAs('deleter@test.com');

         expect((await api.del(`/files/${file.id}`, deleter)).status).toBe(403);
         expect(
            (await prisma.file.findUniqueOrThrow({ where: { id: file.id } })).deletedAt,
         ).toBeNull();
      });
   });

   describe('permissions', () => {
      it('needs the delete permission for every trash endpoint', async () => {
         await createTestUser({ email: 'editor@test.com', role: 'editor' });
         const editor = await loginAs('editor@test.com');
         const project = await createProject(token, { slug: 'guarded' });
         await api.del(`/projects/${project.id}`).expect(204);

         for (const resource of ['projects', 'services', 'tags', 'files']) {
            expect((await api.get(`/${resource}/trash`, editor)).status).toBe(403);
            expect((await api.post(`/${resource}/1/restore`, {}, editor)).status).toBe(403);
            expect((await api.del(`/${resource}/1/permanent`, editor)).status).toBe(403);
            expect((await api.del(`/${resource}/1`, editor)).status).toBe(403);
         }
         expect((await api.get('/projects/trash')).status).toBe(200);
      });
   });

   describe('purge job', () => {
      const purge = () => getApp().get(TrashPurgeService);

      it('deletes only what has been in the trash longer than the retention, by a fake clock', async () => {
         const old = await createProject(token, { slug: 'old' });
         const fresh = await createProject(token, { slug: 'fresh' });
         const live = await createProject(token, { slug: 'live' });
         await api.del(`/projects/${old.id}`).expect(204);
         await api.del(`/projects/${fresh.id}`).expect(204);
         await prisma.project.update({
            where: { id: old.id },
            data: { deletedAt: new Date(Date.now() - 31 * DAY) },
         });

         const result = await purge().purgeExpired();

         expect(result).toMatchObject({ purged: 1, skipped: 0, capped: false });
         expect(
            await prisma.project.findMany({ select: { id: true }, orderBy: { id: 'asc' } }),
         ).toEqual([{ id: fresh.id }, { id: live.id }].sort((a, b) => a.id - b.id));

         expect((await purge().purgeExpired(new Date(Date.now() + 29 * DAY))).purged).toBe(0);
         expect((await purge().purgeExpired(new Date(Date.now() + 31 * DAY))).purged).toBe(1);
         expect(await prisma.project.count()).toBe(1);
      });

      it('purges services, tags and files too and writes a system audit entry per row', async () => {
         const service = await createService('old-service');
         const tag = await createTag('Old', 'old-tag');
         const file = await createFile('old.jpg');
         await api.del(`/services/${service.id}`).expect(204);
         await api.del(`/tags/${tag.id}`).expect(204);
         await api.del(`/files/${file.id}`).expect(204);

         const result = await purge().purgeExpired(new Date(Date.now() + 31 * DAY));

         expect(result.purged).toBe(3);
         expect(await prisma.service.count()).toBe(0);
         expect(await prisma.tag.count()).toBe(0);
         expect(await prisma.file.count()).toBe(0);
         const audit = await prisma.auditLog.findMany({
            where: { actorType: 'system' },
            orderBy: { action: 'asc' },
         });
         expect(audit.map((row) => row.action)).toEqual([
            'file.purge',
            'service.purge',
            'tag.purge',
         ]);
         expect(audit[1]).toMatchObject({
            resourceType: 'service',
            resourceId: String(service.id),
         });
      });

      it('skips a file a project still uses and leaves it in the trash', async () => {
         const project = await createProject(token, { slug: 'uses' });
         const file = await createFile('kept.jpg');
         await api.post(`/projects/${project.id}/media`, { fileId: file.id }).expect(201);
         await api.del(`/files/${file.id}`).expect(204);

         const result = await purge().purgeExpired(new Date(Date.now() + 31 * DAY));

         expect(result).toMatchObject({ purged: 0, skipped: 1 });
         expect(await prisma.file.count()).toBe(1);
      });

      it('is not blocked by files that cannot be deleted: newer expired rows still go', async () => {
         const project = await createProject(token, { slug: 'blocker' });
         const blocked = await Promise.all(['b1.jpg', 'b2.jpg', 'b3.jpg'].map(createFile));
         for (const file of blocked) {
            await api.post(`/projects/${project.id}/media`, { fileId: file.id }).expect(201);
         }
         const newer = await createFile('newer.jpg');
         for (const file of [...blocked, newer]) await api.del(`/files/${file.id}`);
         await prisma.file.updateMany({
            where: { id: { in: blocked.map((file) => file.id) } },
            data: { deletedAt: new Date(Date.now() - 60 * DAY) },
         });
         await prisma.file.update({
            where: { id: newer.id },
            data: { deletedAt: new Date(Date.now() - 40 * DAY) },
         });

         const result = await purge().purgeExpired(new Date(), { maxPerRun: 2 });

         expect(result).toMatchObject({ purged: 1, skipped: 3 });
         expect(await prisma.file.findUnique({ where: { id: newer.id } })).toBeNull();
         expect(await purge().purgeExpired(new Date(), { maxPerRun: 2 })).toMatchObject({
            purged: 0,
            skipped: 3,
         });
      });

      it('stops at the cap and leaves the rest for the next run', async () => {
         const a = await createProject(token, { slug: 'cap-a' });
         const b = await createProject(token, { slug: 'cap-b' });
         await api.del(`/projects/${a.id}`).expect(204);
         await api.del(`/projects/${b.id}`).expect(204);

         const result = await purge().purgeExpired(new Date(Date.now() + 31 * DAY), {
            maxPerRun: 1,
         });

         expect(result).toMatchObject({ purged: 1, capped: true });
         expect(await prisma.project.count()).toBe(1);
      });
   });
});
