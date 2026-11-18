import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin } from '../../setup/users';

describe('Service SEO: meta fields and slug redirects (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.slugRedirect.deleteMany();
      await prisma.serviceProject.deleteMany();
      await prisma.serviceTranslation.deleteMany();
      await prisma.service.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { isSystem: false } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const body = (overrides: Record<string, unknown> = {}) => ({
      slug: 'web-development',
      showOnHomepage: true,
      translations: [
         {
            language: 'cs',
            title: 'Vývoj webu',
            metaTitle: '  Vývoj webu na míru  ',
            metaDescription: 'Weby na míru pro firmy',
         },
         { language: 'en', title: 'Web development', metaTitle: '', metaDescription: null },
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

   const patch = (token: string, id: number, data: Record<string, unknown>) =>
      getHttpServer().patch(`/services/${id}`).set('Authorization', `Bearer ${token}`).send(data);

   const redirect = (slug: string) => getHttpServer().get(`/public/services/redirect/${slug}`);

   describe('meta title and description', () => {
      it('are saved per language, trimmed, an empty one is stored as null', async () => {
         const token = await createAdminAndLogin();

         const created = await saveNew(token, body({ status: 'published' }));

         expect(created.status).toBe(201);
         const byLanguage = Object.fromEntries(
            created.body.translations.map((tr: { language: string }) => [tr.language, tr]),
         );
         expect(byLanguage.cs).toMatchObject({
            metaTitle: 'Vývoj webu na míru',
            metaDescription: 'Weby na míru pro firmy',
         });
         expect(byLanguage.en).toMatchObject({ metaTitle: null, metaDescription: null });

         const publicList = await getHttpServer()
            .get('/public/services')
            .set('Accept-Language', 'cs');
         expect(publicList.body.data[0].translations[0]).toMatchObject({
            metaTitle: 'Vývoj webu na míru',
         });
      });

      it('are changed by the single-part translation endpoint, an omitted one is kept', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, body()).expect(201);

         const response = await getHttpServer()
            .post(`/services/${created.body.id}/translations/cs`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Vývoj webu', metaDescription: 'Nový popis' });

         expect(response.status).toBe(201);
         expect(response.body).toMatchObject({
            metaTitle: 'Vývoj webu na míru',
            metaDescription: 'Nový popis',
         });
      });
   });

   describe('slug redirects', () => {
      it('redirects the former slug of a published service, through save and PATCH', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, body({ status: 'published' })).expect(201);
         const id = created.body.id as number;

         await save(token, id, body({ slug: 'web-design' })).expect(200);
         expect((await redirect('web-development')).body).toEqual({ slug: 'web-design' });

         await patch(token, id, { slug: 'web-studio' }).expect(200);
         expect((await redirect('web-development')).body).toEqual({ slug: 'web-studio' });
         expect((await redirect('web-design')).body).toEqual({ slug: 'web-studio' });
         expect(await prisma.slugRedirect.count()).toBe(2);
      });

      it('leaves nothing for a draft, answers 404 once unpublished and drops rows of a purged service', async () => {
         const token = await createAdminAndLogin();
         const draft = await saveNew(token, body({ slug: 'draft' })).expect(201);
         await save(token, draft.body.id, body({ slug: 'draft-renamed' })).expect(200);
         expect(await prisma.slugRedirect.count()).toBe(0);

         const live = await saveNew(token, body({ slug: 'live', status: 'published' })).expect(201);
         await save(
            token,
            live.body.id,
            body({ slug: 'live-renamed', status: 'published' }),
         ).expect(200);
         expect((await redirect('live')).status).toBe(200);

         await getHttpServer()
            .patch(`/services/${live.body.id}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'draft' })
            .expect(200);
         expect((await redirect('live')).status).toBe(404);

         await getHttpServer()
            .delete(`/services/${live.body.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(204);
         expect(await prisma.slugRedirect.count()).toBe(1);
         await getHttpServer()
            .delete(`/services/${live.body.id}/permanent`)
            .set('Authorization', `Bearer ${token}`)
            .expect(204);
         expect(await prisma.slugRedirect.count()).toBe(0);
      });

      it('keeps the two resources apart', async () => {
         const token = await createAdminAndLogin();
         const created = await saveNew(token, body({ status: 'published' })).expect(201);
         await patch(token, created.body.id, { slug: 'renamed' }).expect(200);

         expect(
            (await getHttpServer().get('/public/projects/redirect/web-development')).status,
         ).toBe(404);
      });
   });
});
