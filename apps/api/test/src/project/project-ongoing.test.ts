import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin } from '../../setup/users';

describe('Project ongoing flag (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectLink.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.projectMedia.deleteMany();
      await prisma.project.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const form = (overrides: Record<string, unknown> = {}) => ({
      slug: 'ongoing-project',
      thumbnailId: null,
      showOnHomepage: false,
      company: null,
      startYear: null,
      endYear: null,
      translations: [{ language: 'cs', title: 'Běžící projekt' }],
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

   const patch = (token: string, id: number, body: object) =>
      getHttpServer().patch(`/projects/${id}`).set('Authorization', `Bearer ${token}`).send(body);

   const detail = (token: string, id: number) =>
      getHttpServer().get(`/projects/${id}`).set('Authorization', `Bearer ${token}`);

   const seedRunning = async (token: string) => {
      const response = await saveNew(token, form({ startYear: 2020, ongoing: true }));
      expect(response.status).toBe(201);
      return response.body as { id: number };
   };

   describe('POST /projects/save', () => {
      it('should default to false and store a running project when ongoing is true', async () => {
         const token = await createAdminAndLogin();

         const plain = await saveNew(token, form({ startYear: 2020 }));
         const running = await saveNew(
            token,
            form({ slug: 'running', startYear: 2020, ongoing: true }),
         );

         expect(plain.status).toBe(201);
         expect(plain.body.ongoing).toBe(false);
         expect(running.status).toBe(201);
         expect(running.body).toMatchObject({ startYear: 2020, endYear: null, ongoing: true });
      });

      it.each([
         ['without a start year', { ongoing: true }],
         ['with an end year', { startYear: 2020, endYear: 2022, ongoing: true }],
         ['that is not a boolean', { startYear: 2020, ongoing: 'yes' }],
      ])('should answer 400 for ongoing %s and store nothing', async (_case, override) => {
         const token = await createAdminAndLogin();

         const response = await saveNew(token, form(override));

         expect(response.status).toBe(400);
         expect(await prisma.project.count()).toBe(0);
      });
   });

   describe('PUT /projects/:id/save', () => {
      it('should keep the stored flag when ongoing is omitted (stale form)', async () => {
         const token = await createAdminAndLogin();
         const { id } = await seedRunning(token);

         const response = await saveExisting(token, id, form({ startYear: 2021 }));

         expect(response.status).toBe(200);
         expect(response.body).toMatchObject({ startYear: 2021, endYear: null, ongoing: true });
      });

      it('should answer 400 when an omitted flag would stay true next to a new end year', async () => {
         const token = await createAdminAndLogin();
         const { id } = await seedRunning(token);

         const response = await saveExisting(token, id, form({ startYear: 2020, endYear: 2022 }));

         expect(response.status).toBe(400);
         expect((await prisma.project.findUniqueOrThrow({ where: { id } })).endYear).toBeNull();
      });

      it('should finish a running project with ongoing false and an end year', async () => {
         const token = await createAdminAndLogin();
         const { id } = await seedRunning(token);

         const response = await saveExisting(
            token,
            id,
            form({ startYear: 2020, endYear: 2022, ongoing: false }),
         );

         expect(response.status).toBe(200);
         expect(response.body).toMatchObject({ startYear: 2020, endYear: 2022, ongoing: false });
      });

      it('should answer 400 for ongoing true with an end year', async () => {
         const token = await createAdminAndLogin();
         const { id } = await seedRunning(token);

         const response = await saveExisting(
            token,
            id,
            form({ startYear: 2020, endYear: 2022, ongoing: true }),
         );

         expect(response.status).toBe(400);
      });
   });

   describe('PATCH /projects/:id', () => {
      it('should keep the flag when it is omitted', async () => {
         const token = await createAdminAndLogin();
         const { id } = await seedRunning(token);

         const company = await patch(token, id, { company: 'ACME' });

         expect(company.status).toBe(200);
         expect((await detail(token, id)).body.ongoing).toBe(true);
      });

      it('should evaluate the rule on the merged state', async () => {
         const token = await createAdminAndLogin();
         const { id } = await seedRunning(token);

         const endYear = await patch(token, id, { endYear: 2022 });
         const noStart = await patch(token, id, { startYear: null });
         const finished = await patch(token, id, { endYear: 2022, ongoing: false });

         expect(endYear.status).toBe(400);
         expect(noStart.status).toBe(400);
         expect(finished.status).toBe(200);
         expect(finished.body).toMatchObject({ endYear: 2022, ongoing: false });
      });

      it('should reject ongoing true on a project without a start year', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, form());

         const response = await patch(token, created.body.id, { ongoing: true });

         expect(response.status).toBe(400);
      });
   });

   describe('GET /public/projects', () => {
      it('should expose ongoing in the detail and the list of a published project', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(
            token,
            form({ startYear: 2020, ongoing: true, status: 'published' }),
         );
         expect(created.status).toBe(201);

         const one = await getHttpServer().get('/public/projects/ongoing-project');
         const list = await getHttpServer().get('/public/projects');

         expect(one.status).toBe(200);
         expect(one.body).toMatchObject({ startYear: 2020, endYear: null, ongoing: true });
         expect(list.body.data[0]).toMatchObject({ ongoing: true });
      });
   });
});
