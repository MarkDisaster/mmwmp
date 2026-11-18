import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createProject } from '../../setup/projects';
import { createAdminAndLogin } from '../../setup/users';

describe('Project company, period and role (e2e)', () => {
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
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const PROJECT = { slug: 'meta-project', title: 'Meta Project' };

   const patchProject = (token: string, id: number, data: Record<string, unknown>) =>
      getHttpServer().patch(`/projects/${id}`).set('Authorization', `Bearer ${token}`).send(data);

   const getProject = (token: string, id: number) =>
      getHttpServer().get(`/projects/${id}`).set('Authorization', `Bearer ${token}`);

   describe('PATCH /projects/:id', () => {
      it('should store company and period and return them in the detail', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);

         const response = await patchProject(token, id, {
            company: 'Srovnáme s.r.o.',
            startYear: 2025,
         });
         const detail = await getProject(token, id);

         expect(response.status).toBe(200);
         expect(detail.body.company).toBe('Srovnáme s.r.o.');
         expect(detail.body.startYear).toBe(2025);
         expect(detail.body.endYear).toBeNull();
      });

      it('should clear fields when null is sent', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);
         await patchProject(token, id, {
            company: 'ACME',
            startYear: 2020,
            endYear: 2022,
         }).expect(200);

         const response = await patchProject(token, id, {
            company: null,
            startYear: null,
            endYear: null,
         });

         expect(response.status).toBe(200);
         expect(response.body.company).toBeNull();
         expect(response.body.startYear).toBeNull();
         expect(response.body.endYear).toBeNull();
      });

      it('should store an empty company as null', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);

         const response = await patchProject(token, id, { company: '   ' });

         expect(response.status).toBe(200);
         expect(response.body.company).toBeNull();
      });

      it('should leave omitted fields untouched', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);
         await patchProject(token, id, { company: 'ACME', startYear: 2021 }).expect(200);

         const response = await patchProject(token, id, { showOnHomepage: true });
         const detail = await getProject(token, id);

         expect(response.status).toBe(200);
         expect(detail.body.showOnHomepage).toBe(true);
         expect(detail.body.company).toBe('ACME');
         expect(detail.body.startYear).toBe(2021);
      });

      it('should reject a company longer than 200 characters', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);

         const response = await patchProject(token, id, { company: 'x'.repeat(201) });

         expect(response.status).toBe(400);
      });

      it('should reject an end year before the start year', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);

         const response = await patchProject(token, id, { startYear: 2025, endYear: 2024 });

         expect(response.status).toBe(400);
      });

      it('should reject an end year without a start year', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);

         const response = await patchProject(token, id, { endYear: 2024 });

         expect(response.status).toBe(400);
      });

      it('should reject a new start year that moves past the stored end year', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);
         await patchProject(token, id, { startYear: 2020, endYear: 2022 }).expect(200);

         const response = await patchProject(token, id, { startYear: 2023 });

         expect(response.status).toBe(400);
      });

      it.each([1989, 2101, 2025.5])('should reject the year %s', async (year) => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);

         const response = await patchProject(token, id, { startYear: year });

         expect(response.status).toBe(400);
      });
   });

   describe('year range in the database', () => {
      it.each([
         {
            data: { startYear: 2025, endYear: 2024 },
            description: 'an end year before the start year',
         },
         {
            data: { startYear: null, endYear: 2024 },
            description: 'an end year without a start year',
         },
      ])('should reject a direct write with $description', async ({ data }) => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);

         await expect(prisma.project.update({ where: { id }, data })).rejects.toThrow(
            /projects_year_range_check/,
         );
      });

      it('should accept an ongoing and a closed range', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);

         await prisma.project.update({ where: { id }, data: { startYear: 2024, endYear: null } });
         const closed = await prisma.project.update({
            where: { id },
            data: { startYear: 2024, endYear: 2024 },
         });

         expect(closed.endYear).toBe(2024);
      });
   });

   describe('role', () => {
      it('should store the role from the create request on the translation', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, { ...PROJECT, role: 'Frontend developer' });

         const detail = await getProject(token, id);

         expect(detail.body.translations[0].role).toBe('Frontend developer');
      });

      it('should store a role per language', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, { ...PROJECT, role: 'Vývojář frontendu' });

         await getHttpServer()
            .post(`/projects/${id}/translations/en`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Meta Project', role: 'Frontend developer' })
            .expect(201);
         const detail = await getProject(token, id);

         const roles = Object.fromEntries(
            detail.body.translations.map((tr: { language: string; role: string }) => [
               tr.language,
               tr.role,
            ]),
         );
         expect(roles).toEqual({ cs: 'Vývojář frontendu', en: 'Frontend developer' });
      });

      it('should clear the role when null is sent', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, { ...PROJECT, role: 'Designer' });

         const response = await getHttpServer()
            .post(`/projects/${id}/translations/cs`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Meta Project', role: null });

         expect(response.status).toBe(201);
         expect(response.body.role).toBeNull();
      });

      it('should reject a role longer than 100 characters', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, PROJECT);

         const response = await getHttpServer()
            .post(`/projects/${id}/translations/cs`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Meta Project', role: 'x'.repeat(101) });

         expect(response.status).toBe(400);
      });

      it('should clear the role when an empty value is sent', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, { ...PROJECT, role: 'Designer' });

         const response = await getHttpServer()
            .post(`/projects/${id}/translations/cs`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Meta Project', role: '' });

         expect(response.status).toBe(201);
         expect(response.body.role).toBeNull();
      });
   });

   describe('GET /public/projects/:slug', () => {
      it('should expose company, period and role of a published project', async () => {
         const token = await createAdminAndLogin();
         const { id } = await createProject(token, { ...PROJECT, role: 'Frontend developer' });
         await patchProject(token, id, { company: 'Srovnáme s.r.o.', startYear: 2025 });
         await getHttpServer()
            .patch(`/projects/${id}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'published' });

         const response = await getHttpServer().get('/public/projects/meta-project');

         expect(response.status).toBe(200);
         expect(response.body.company).toBe('Srovnáme s.r.o.');
         expect(response.body.startYear).toBe(2025);
         expect(response.body.endYear).toBeNull();
         expect(response.body.translations[0].role).toBe('Frontend developer');
      });
   });
});
