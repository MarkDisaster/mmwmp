import { createHmac } from 'crypto';

import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin } from '../../setup/users';

describe('Preview URL and draft access (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.serviceProject.deleteMany();
      await prisma.serviceTranslation.deleteMany();
      await prisma.service.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const signingKey = () => process.env.PREVIEW_URL_SIGNING_KEY ?? '';
   const apiToken = () => process.env.PREVIEW_API_TOKEN ?? '';

   const readToken = (previewUrl: string) => {
      const url = new URL(previewUrl);
      expect(`${url.origin}${url.pathname}`).toBe(`${process.env.WEB_URL}/api/draft`);
      expect([...url.searchParams.keys()]).toEqual(['token']);

      const [body, signature] = (url.searchParams.get('token') ?? '').split('.');
      expect(signature).toBe(createHmac('sha256', signingKey()).update(body).digest('base64url'));
      return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
   };

   const createDraft = async (token: string, resource: 'projects' | 'services', slug: string) => {
      const response = await getHttpServer()
         .post(`/${resource}`)
         .set('Authorization', `Bearer ${token}`)
         .send({ title: slug, slug, language: 'cs' });
      expect(response.status).toBe(201);
      return response.body as { id: number };
   };

   it.each(['projects', 'services'] as const)(
      'signs a 5-minute link to the %s draft in the asked language',
      async (resource) => {
         const token = await createAdminAndLogin();
         const { id } = await createDraft(token, resource, 'draft-one');
         const before = Math.floor(Date.now() / 1000);

         const response = await getHttpServer()
            .get(`/${resource}/${id}/preview-url?locale=en`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         const payload = readToken(response.body.previewUrl);
         expect(payload).toEqual({
            resource,
            id,
            slug: 'draft-one',
            locale: 'en',
            exp: expect.any(Number),
         });
         expect(payload.exp).toBeGreaterThanOrEqual(before + 300);
         expect(payload.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 300);
      },
   );

   it('never puts a secret into the link and defaults to Czech', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createDraft(token, 'projects', 'draft-two');

      const response = await getHttpServer()
         .get(`/projects/${id}/preview-url`)
         .set('Authorization', `Bearer ${token}`);

      expect(response.body.previewUrl).not.toContain(signingKey());
      expect(response.body.previewUrl).not.toContain(apiToken());
      expect(readToken(response.body.previewUrl).locale).toBe('cs');
   });

   it('needs a login for the link', async () => {
      const response = await getHttpServer().get('/projects/1/preview-url');

      expect(response.status).toBe(401);
   });

   it('serves a project draft for PREVIEW_API_TOKEN only, not for the link token or the key', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createDraft(token, 'projects', 'draft-three');
      const link = await getHttpServer()
         .get(`/projects/${id}/preview-url`)
         .set('Authorization', `Bearer ${token}`);
      const linkToken = new URL(link.body.previewUrl).searchParams.get('token');

      const draft = (bearer: string | null) =>
         getHttpServer()
            .get('/public/projects/draft-three')
            .set('Authorization', `Bearer ${bearer}`);

      expect((await draft(apiToken())).status).toBe(200);
      expect((await draft(linkToken)).status).toBe(404);
      expect((await draft(signingKey())).status).toBe(404);
   });
});
