import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin, createTestUser, loginAs } from '../../setup/users';

describe('Service list (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.serviceProject.deleteMany();
      await prisma.serviceTranslation.deleteMany();
      await prisma.service.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const createService = async (token: string, slug: string) => {
      const response = await getHttpServer()
         .post('/services')
         .set('Authorization', `Bearer ${token}`)
         .send({ title: slug, slug, language: 'cs' });
      expect(response.status).toBe(201);
      return response.body as { id: number };
   };

   const publish = (token: string, id: number) =>
      getHttpServer()
         .patch(`/services/${id}/status`)
         .set('Authorization', `Bearer ${token}`)
         .send({ status: 'published' });

   describe('GET /services', () => {
      it('should filter by status before paginating and counting', async () => {
         const token = await createAdminAndLogin();
         await createService(token, 'a');
         const b = await createService(token, 'b');
         await createService(token, 'c');
         await publish(token, b.id);

         const response = await getHttpServer()
            .get('/services?status=draft&limit=1&page=1')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(2);
         expect(response.body.data).toHaveLength(1);
         expect(response.body.data[0].status).toBe('draft');
      });

      it('should reject an unknown status', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .get('/services?status=archived')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(400);
      });
   });

   describe('GET /services sorting', () => {
      const saveService = async (token: string, slug: string) => {
         const response = await getHttpServer()
            .post('/services/save')
            .set('Authorization', `Bearer ${token}`)
            .send({
               slug,
               showOnHomepage: false,
               translations: [{ language: 'cs', title: slug }],
               projectIds: [],
            });
         expect(response.status).toBe(201);
         return response.body as { id: number };
      };

      const createAuthorsAndServices = async () => {
         const authors = [
            { email: 'zeta@test.com', lastName: 'Zeta', slug: 'by-zeta' },
            { email: 'alpha@test.com', lastName: 'Alpha', slug: 'by-alpha' },
            { email: 'mid@test.com', lastName: 'Mid', slug: 'by-mid' },
         ];
         let firstToken = '';
         const ids: Record<string, number> = {};
         for (const author of authors) {
            await createTestUser({ email: author.email, lastName: author.lastName });
            const token = await loginAs(author.email);
            firstToken ||= token;
            ids[author.slug] = (await saveService(token, author.slug)).id;
         }
         return { token: firstToken, ids };
      };

      const slugsOf = (body: { data: { slug: string }[] }) => body.data.map((s) => s.slug);

      const list = (token: string, query: string) =>
         getHttpServer().get(`/services?${query}`).set('Authorization', `Bearer ${token}`);

      it('should sort by the author with sortBy=createdBy, ascending and descending', async () => {
         const { token } = await createAuthorsAndServices();

         const asc = await list(token, 'sortBy=createdBy&sortOrder=asc');
         const desc = await list(token, 'sortBy=createdBy&sortOrder=desc');

         expect(asc.status).toBe(200);
         expect(slugsOf(asc.body)).toEqual(['by-alpha', 'by-mid', 'by-zeta']);
         expect(desc.status).toBe(200);
         expect(slugsOf(desc.body)).toEqual(['by-zeta', 'by-mid', 'by-alpha']);
      });

      it.each(['author', 'slug', 'nonsense'])(
         'should fall back to the manual order for sortBy=%s',
         async (sortBy) => {
            const { token } = await createAuthorsAndServices();

            const response = await list(token, `sortBy=${sortBy}&sortOrder=asc`);

            expect(response.status).toBe(200);
            expect(slugsOf(response.body)).toEqual(['by-zeta', 'by-alpha', 'by-mid']);
         },
      );

      it('should sort by updatedAt, the last changed first', async () => {
         const { token, ids } = await createAuthorsAndServices();
         const published = await publish(token, ids['by-alpha']);
         expect(published.status).toBe(200);

         const response = await list(token, 'sortBy=updatedAt&sortOrder=desc');

         expect(response.status).toBe(200);
         expect(slugsOf(response.body)).toEqual(['by-alpha', 'by-mid', 'by-zeta']);
      });
   });
});
