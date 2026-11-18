import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createTestUser, loginAs } from '../../setup/users';

describe('ContactController (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.contact.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   describe('GET /contact', () => {
      it('should return null when no contact exists', async () => {
         await createTestUser();
         const token = await loginAs();

         const response = await getHttpServer()
            .get('/contact')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.text).toBe('');
      });

      it('should return 401 without token', async () => {
         const response = await getHttpServer().get('/contact');
         expect(response.status).toBe(401);
      });
   });

   describe('PUT /contact', () => {
      it('should create contact info with all fields', async () => {
         await createTestUser();
         const token = await loginAs();

         const payload = {
            companyName: 'Marek Marek',
            phone: '728 303 508',
            email: 'marek@marek.media',
            street: 'Bílkova 855/19',
            zip: '110 00',
            city: 'Praha 1 – Staré Město',
            ico: '11916672',
            vatPayer: false,
            linkedinUrl: 'https://linkedin.com/in/marek',
            githubUrl: 'https://github.com/marek',
         };

         const response = await getHttpServer()
            .put('/contact')
            .set('Authorization', `Bearer ${token}`)
            .send(payload);

         expect(response.status).toBe(200);
         expect(response.body.companyName).toBe('Marek Marek');
         expect(response.body.phone).toBe(payload.phone);
         expect(response.body.email).toBe(payload.email);
         expect(response.body.street).toBe(payload.street);
         expect(response.body.zip).toBe(payload.zip);
         expect(response.body.city).toBe(payload.city);
         expect(response.body.ico).toBe(payload.ico);
         expect(response.body.vatPayer).toBe(payload.vatPayer);
         expect(response.body.linkedinUrl).toBe(payload.linkedinUrl);
         expect(response.body.githubUrl).toBe(payload.githubUrl);
      });

      it.each([
         ['linkedinUrl', 'javascript:alert(1)'],
         ['linkedinUrl', 'linkedin.com/in/marek'],
         ['githubUrl', 'ftp://github.com/marek'],
         ['githubUrl', 'https://localhost'],
      ])('should reject %s %s', async (field, value) => {
         await createTestUser();
         const token = await loginAs();

         const response = await getHttpServer()
            .put('/contact')
            .set('Authorization', `Bearer ${token}`)
            .send({ [field]: value, translations: [] });

         expect(response.status).toBe(400);
         expect(response.body.message).toEqual([expect.stringMatching(new RegExp(`^${field} `))]);
      });

      describe('translations aboutTitle', () => {
         const put = (token: string, translations: unknown[]) =>
            getHttpServer()
               .put('/contact')
               .set('Authorization', `Bearer ${token}`)
               .send({ vatPayer: false, translations });

         const titleOf = (body: { translations: { language: string; aboutTitle: string }[] }) =>
            body.translations.find((t) => t.language === 'cs')?.aboutTitle;

         it('should save the heading, expose it publicly and keep it when omitted', async () => {
            await createTestUser();
            const token = await loginAs();

            const saved = await put(token, [
               { language: 'cs', description: '<p>Text</p>', aboutTitle: '  <b>Kdo</b> jsem ' },
            ]);
            expect(saved.status).toBe(200);
            expect(titleOf(saved.body)).toBe('Kdo jsem');

            const kept = await put(token, [{ language: 'cs', description: '<p>Nový</p>' }]);
            expect(kept.status).toBe(200);
            expect(titleOf(kept.body)).toBe('Kdo jsem');

            const publicResponse = await getHttpServer().get('/public/contact');
            expect(titleOf(publicResponse.body)).toBe('Kdo jsem');
         });

         it.each([null, '', '   '])('should clear the heading for %j', async (value) => {
            await createTestUser();
            const token = await loginAs();
            await put(token, [{ language: 'cs', aboutTitle: 'Kdo jsem' }]).expect(200);

            const response = await put(token, [{ language: 'cs', aboutTitle: value }]);

            expect(response.status).toBe(200);
            expect(titleOf(response.body)).toBeNull();
         });

         it('should reject a heading longer than 120 characters', async () => {
            await createTestUser();
            const token = await loginAs();

            const response = await put(token, [{ language: 'cs', aboutTitle: 'a'.repeat(121) }]);

            expect(response.status).toBe(400);
         });
      });

      describe('vatPayer', () => {
         const put = (token: string, body: object) =>
            getHttpServer().put('/contact').set('Authorization', `Bearer ${token}`).send(body);

         it('should save false on the first save without the flag', async () => {
            await createTestUser();
            const token = await loginAs();

            const response = await put(token, { phone: '728 303 508' });

            expect(response.status).toBe(200);
            expect(response.body.vatPayer).toBe(false);
         });

         it('should keep the stored flag when it is omitted', async () => {
            await createTestUser();
            const token = await loginAs();
            await put(token, { vatPayer: true }).expect(200);

            const response = await put(token, { phone: '999 999 999' });

            expect(response.status).toBe(200);
            expect(response.body.vatPayer).toBe(true);
            expect((await prisma.contact.findFirstOrThrow()).vatPayer).toBe(true);
         });

         it('should reject null', async () => {
            await createTestUser();
            const token = await loginAs();

            const response = await put(token, { vatPayer: null });

            expect(response.status).toBe(400);
            expect(response.body.message).toEqual(['vatPayer must be a boolean value']);
         });
      });

      it('should update existing contact info (upsert behavior)', async () => {
         await createTestUser();
         const token = await loginAs();

         await getHttpServer()
            .put('/contact')
            .set('Authorization', `Bearer ${token}`)
            .send({ phone: '111 111 111', email: 'first@test.com', vatPayer: false })
            .expect(200);
         expect(await prisma.contact.count()).toBe(1);

         const response = await getHttpServer()
            .put('/contact')
            .set('Authorization', `Bearer ${token}`)
            .send({ phone: '999 999 999', email: 'updated@test.com', vatPayer: false });

         expect(response.status).toBe(200);
         expect(response.body.phone).toBe('999 999 999');
         expect(response.body.email).toBe('updated@test.com');

         const count = await prisma.contact.count();
         expect(count).toBe(1);
      });

      it('should return 401 without token', async () => {
         const response = await getHttpServer().put('/contact').send({ phone: '728 303 508' });

         expect(response.status).toBe(401);
      });

      it('should return 403 for non-admin user', async () => {
         await createTestUser({ email: 'chief@test.com', role: 'editor' });
         const token = await loginAs('chief@test.com');

         const response = await getHttpServer()
            .put('/contact')
            .set('Authorization', `Bearer ${token}`)
            .send({ phone: '728 303 508', vatPayer: false });

         expect(response.status).toBe(403);
      });
   });

   describe('GET /public/contact', () => {
      it('should return contact info without auth', async () => {
         await prisma.contact.create({
            data: {
               phone: '728 303 508',
               email: 'marek@marek.media',
               city: 'Praha',
            },
         });

         const response = await getHttpServer().get('/public/contact');

         expect(response.status).toBe(200);
         expect(response.body.phone).toBe('728 303 508');
         expect(response.body.email).toBe('marek@marek.media');
         expect(response.body.city).toBe('Praha');
      });

      it('should return null when no contact exists', async () => {
         const response = await getHttpServer().get('/public/contact');

         expect(response.status).toBe(200);
         expect(response.text).toBe('');
      });
   });
});
