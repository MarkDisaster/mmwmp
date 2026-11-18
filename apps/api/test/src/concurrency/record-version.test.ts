import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { holdLock, holdRowLock, startRequest, waitForLockWait } from '../../setup/locks';
import { names } from '../../setup/tags';
import { createAdminAndLogin } from '../../setup/users';

describe('Record version and 409 VERSION_CONFLICT (e2e)', () => {
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
      await prisma.file.deleteMany();
      await prisma.tagTranslation.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.contactTranslation.deleteMany();
      await prisma.contact.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(async () => {
      await cleanupDb();
      token = await createAdminAndLogin();
   });
   afterAll(cleanupDb);

   const api = () => ({
      post: (url: string) => getHttpServer().post(url).set('Authorization', `Bearer ${token}`),
      put: (url: string) => getHttpServer().put(url).set('Authorization', `Bearer ${token}`),
      patch: (url: string) => getHttpServer().patch(url).set('Authorization', `Bearer ${token}`),
   });

   const projectForm = (overrides: Record<string, unknown> = {}) => ({
      slug: 'alfa',
      thumbnailId: null,
      showOnHomepage: false,
      company: null,
      startYear: null,
      endYear: null,
      translations: [{ language: 'cs', title: 'Alfa' }],
      tagIds: [],
      links: [],
      media: [],
      ...overrides,
   });

   const createProject = async () => {
      const response = await api().post('/projects/save').send(projectForm());
      expect(response.status).toBe(201);
      return response.body as { id: number; version: number };
   };

   const storedProject = (id: number) =>
      prisma.project.findUniqueOrThrow({
         where: { id },
         select: { version: true, company: true, translations: { select: { title: true } } },
      });

   describe('a new record', () => {
      it('starts with version 0 and the detail returns it', async () => {
         const project = await createProject();
         expect(project.version).toBe(0);

         const detail = await api().post('/projects').send({
            title: 'Beta',
            slug: 'beta',
            language: 'cs',
         });
         expect(detail.body).toMatchObject({ version: 0 });

         const read = await getHttpServer()
            .get(`/projects/${project.id}`)
            .set('Authorization', `Bearer ${token}`);
         expect(read.body).toMatchObject({ id: project.id, version: 0 });
      });

      it('starts with version 0 for a service, a tag and the contact as well', async () => {
         const service = await api()
            .post('/services/save')
            .send({
               slug: 'web',
               showOnHomepage: false,
               translations: [{ language: 'cs', title: 'Web' }],
               projectIds: [],
            });
         const tag = await api()
            .post('/tags')
            .send({ slug: 'react', translations: [{ language: 'cs', name: 'React' }] });
         const contact = await api().put('/contact').send({ vatPayer: false, version: 5 });

         expect([service.body, tag.body, contact.body]).toMatchObject([
            { version: 0 },
            { version: 0 },
            { version: 0 },
         ]);
      });
   });

   describe('the aggregate save', () => {
      it('answers the first of two saves of the same version and refuses the second', async () => {
         const { id } = await createProject();

         const first = await api()
            .put(`/projects/${id}/save`)
            .send(projectForm({ company: 'First', version: 0 }));
         const second = await api()
            .put(`/projects/${id}/save`)
            .send(projectForm({ company: 'Second', version: 0 }));

         expect(first.status).toBe(200);
         expect(first.body).toMatchObject({ version: 1, company: 'First' });
         expect(second.status).toBe(409);
         expect(second.body).toMatchObject({
            statusCode: 409,
            code: 'VERSION_CONFLICT',
            currentVersion: 1,
         });
         expect(await storedProject(id)).toMatchObject({ version: 1, company: 'First' });
      });

      it('lets exactly one of ten concurrent saves of the same version through', async () => {
         const { id } = await createProject();

         const responses = await Promise.all(
            Array.from({ length: 10 }, (_, index) =>
               api()
                  .put(`/projects/${id}/save`)
                  .send(projectForm({ company: `Save ${index}`, version: 0 })),
            ),
         );

         const statuses = responses.map((response) => response.status).sort();
         expect(statuses).toEqual([200, ...Array<number>(9).fill(409)]);
         for (const response of responses.filter(({ status }) => status === 409)) {
            expect(response.body).toMatchObject({ code: 'VERSION_CONFLICT', currentVersion: 1 });
         }
         const winner = responses.find(({ status }) => status === 200);
         expect(await storedProject(id)).toMatchObject({
            version: 1,
            company: (winner?.body as { company: string }).company,
         });
      });

      it('writes a save without version unchecked and still raises the version', async () => {
         const { id } = await createProject();
         await api().patch(`/projects/${id}`).send({ company: 'Meanwhile' });

         const response = await api()
            .put(`/projects/${id}/save`)
            .send(projectForm({ company: 'Without version' }));

         expect(response.status).toBe(200);
         expect(response.body).toMatchObject({ version: 2, company: 'Without version' });
      });

      it('answers 404, not 409, for a record in the trash', async () => {
         const { id } = await createProject();
         await getHttpServer().delete(`/projects/${id}`).set('Authorization', `Bearer ${token}`);

         const response = await api()
            .put(`/projects/${id}/save`)
            .send(projectForm({ version: 0 }));

         expect(response.status).toBe(404);
      });
   });

   describe('the other writes that take a version', () => {
      it('refuses a partial change of a project based on an older version and writes nothing', async () => {
         const { id } = await createProject();
         await api().patch(`/projects/${id}`).send({ company: 'Newer' });

         const patch = await api().patch(`/projects/${id}`).send({ company: 'Stale', version: 0 });
         const translation = await api()
            .post(`/projects/${id}/translations/cs`)
            .send({ title: 'Stale', version: 0 });
         const status = await api()
            .patch(`/projects/${id}/status`)
            .send({ status: 'published', version: 0 });

         for (const response of [patch, translation, status]) {
            expect(response.status).toBe(409);
            expect(response.body).toMatchObject({ code: 'VERSION_CONFLICT', currentVersion: 1 });
         }
         expect(await storedProject(id)).toMatchObject({
            version: 1,
            company: 'Newer',
            translations: [{ title: 'Alfa' }],
         });
      });

      it('accepts a partial change based on the current version', async () => {
         const { id } = await createProject();

         const response = await api().patch(`/projects/${id}`).send({ company: 'Now', version: 0 });

         expect(response.status).toBe(200);
         expect(response.body).toMatchObject({ version: 1, company: 'Now' });
      });

      it('refuses a move based on an older version and keeps the order', async () => {
         const first = await createProject();
         const second = await api()
            .post('/projects/save')
            .send(projectForm({ slug: 'beta', translations: [{ language: 'cs', title: 'Beta' }] }));
         await api().patch(`/projects/${first.id}`).send({ company: 'Newer' });

         const response = await api()
            .post(`/projects/${first.id}/move`)
            .send({ targetId: (second.body as { id: number }).id, position: 'after', version: 0 });

         expect(response.status).toBe(409);
         expect(response.body).toMatchObject({ code: 'VERSION_CONFLICT', currentVersion: 1 });
         const order = await prisma.project.findMany({
            orderBy: { sortOrder: 'asc' },
            select: { id: true },
         });
         expect(order.map(({ id }) => id)).toEqual([first.id, (second.body as { id: number }).id]);
      });

      it('refuses a stale save of a service, a tag, a file and the contact', async () => {
         const service = await prisma.service.create({
            data: {
               title: 'Web',
               slug: 'web',
               version: 2,
               translations: { create: [{ language: 'cs', title: 'Web' }] },
            },
         });
         const tag = await prisma.tag.create({
            data: { slug: 'react', version: 2, translations: names('React') },
         });
         const file = await prisma.file.create({
            data: {
               filename: 'a.png',
               originalName: 'a.png',
               mimeType: 'image/png',
               size: 1,
               storagePath: 'files/a.png',
               version: 2,
            },
         });
         await prisma.contact.create({ data: { vatPayer: false, version: 2 } });

         const responses = await Promise.all([
            api()
               .put(`/services/${service.id}/save`)
               .send({
                  slug: 'web',
                  showOnHomepage: true,
                  translations: [{ language: 'cs', title: 'Web' }],
                  projectIds: [],
                  version: 1,
               }),
            api().patch(`/tags/${tag.id}`).send({ color: '#000000', version: 1 }),
            api().patch(`/files/${file.id}`).send({ altText: 'Stale', version: 1 }),
            api().put('/contact').send({ vatPayer: true, version: 1 }),
         ]);

         for (const response of responses) {
            expect(response.status).toBe(409);
            expect(response.body).toMatchObject({ code: 'VERSION_CONFLICT', currentVersion: 2 });
         }
         expect(
            await prisma.service.findUniqueOrThrow({ where: { id: service.id } }),
         ).toMatchObject({ version: 2, showOnHomepage: false });
         expect(await prisma.tag.findUniqueOrThrow({ where: { id: tag.id } })).toMatchObject({
            version: 2,
            color: null,
         });
         expect(await prisma.file.findUniqueOrThrow({ where: { id: file.id } })).toMatchObject({
            version: 2,
            altText: null,
         });
         expect(await prisma.contact.findFirstOrThrow()).toMatchObject({
            version: 2,
            vatPayer: false,
         });
      });

      it('rejects a version that is not a non-negative integer', async () => {
         const { id } = await createProject();

         const response = await api().patch(`/projects/${id}`).send({ company: 'x', version: -1 });

         expect(response.status).toBe(400);
      });
   });

   describe('the contact', () => {
      it('answers overlapping saves of the same version with one 200 and 409 for the rest', async () => {
         await prisma.contact.create({ data: { vatPayer: false } });

         const responses = await Promise.all(
            Array.from({ length: 5 }, (_, index) =>
               api()
                  .put('/contact')
                  .send({ vatPayer: index % 2 === 0, version: 0 }),
            ),
         );

         const statuses = responses.map((response) => response.status).sort();
         expect(statuses).toEqual([200, 409, 409, 409, 409]);
         for (const response of responses.filter(({ status }) => status === 409)) {
            expect(['VERSION_CONFLICT', 'BUSY']).toContain(
               (response.body as { code: string }).code,
            );
         }
         expect(await prisma.contact.findFirstOrThrow()).toMatchObject({ version: 1 });
      });

      it('gives the admin the stored version, not the one cached for the web', async () => {
         const { id } = await prisma.contact.create({ data: { vatPayer: false } });
         await getHttpServer().get('/public/contact');
         await prisma.contact.update({ where: { id }, data: { version: 4 } });

         const response = await getHttpServer()
            .get('/contact')
            .set('Authorization', `Bearer ${token}`);

         expect(response.body).toMatchObject({ version: 4 });
      });
   });

   describe('the public endpoints', () => {
      it('leave the version out', async () => {
         const tag = await prisma.tag.create({
            data: { slug: 'react', translations: names('React') },
         });
         await prisma.project.create({
            data: {
               title: 'Alfa',
               slug: 'alfa',
               status: 'published',
               publishedAt: new Date(),
               translations: { create: [{ language: 'cs', title: 'Alfa' }] },
               tags: { create: [{ tagId: tag.id, sortOrder: 0 }] },
            },
         });
         await prisma.service.create({
            data: {
               title: 'Web',
               slug: 'web',
               status: 'published',
               publishedAt: new Date(),
               translations: { create: [{ language: 'cs', title: 'Web' }] },
            },
         });
         await prisma.contact.create({ data: { vatPayer: false } });

         const [project, projects, service, services, tags, contact] = await Promise.all(
            [
               '/public/projects/alfa',
               '/public/projects',
               '/public/services/web',
               '/public/services',
               '/public/tags',
               '/public/contact',
            ].map((url) => getHttpServer().get(url)),
         );

         const bodies = [
            project.body,
            project.body.tags[0].tag,
            projects.body.data[0],
            service.body,
            services.body.data[0],
            tags.body.data[0],
            contact.body,
         ] as object[];
         expect(bodies.map((body) => 'version' in body)).toEqual(bodies.map(() => false));
      });
   });

   describe('the lock order of a file write', () => {
      it('locks the projects of the file before the file, like the bulk update', async () => {
         const file = await prisma.file.create({
            data: {
               filename: 'a.png',
               originalName: 'a.png',
               mimeType: 'image/png',
               size: 1,
               storagePath: 'files/a.png',
            },
         });
         const project = await prisma.project.create({
            data: { title: 'Alfa', slug: 'alfa', thumbnailId: file.id },
         });
         const projectLock = await holdRowLock('projects', project.id);

         const update = startRequest(
            api().patch(`/files/${file.id}`).send({ altText: 'Logo', version: 0 }),
         );
         await waitForLockWait(prisma);
         const fileLock = await holdLock(
            'SELECT id FROM files WHERE id = $1 FOR NO KEY UPDATE NOWAIT',
            [file.id],
         );
         await fileLock.release();
         await projectLock.release();

         const response = await update.promise;
         expect(response.status).toBe(200);
         expect(response.body).toMatchObject({ version: 1, altText: 'Logo' });
      });
   });
});
