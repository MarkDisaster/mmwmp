import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';

describe('Public service list: preview mode (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.serviceTranslation.deleteMany();
      await prisma.service.deleteMany();
   };

   beforeEach(async () => {
      await cleanupDb();
      await prisma.service.createMany({
         data: [
            { slug: 'published', title: 'Published', status: 'published', sortOrder: 0 },
            { slug: 'draft', title: 'Draft', status: 'draft', sortOrder: 1 },
         ],
      });
   });
   afterAll(cleanupDb);

   const slugs = (body: { data: Array<{ slug: string }> }) => body.data.map((s) => s.slug);
   const preview = (secret = process.env.PREVIEW_API_TOKEN) =>
      getHttpServer().get('/public/services').set('Authorization', `Bearer ${secret}`);

   it('lists only published services without the token', async () => {
      const response = await getHttpServer().get('/public/services');

      expect(response.status).toBe(200);
      expect(slugs(response.body)).toEqual(['published']);
   });

   it('lists the drafts too with the preview API token, in the display order', async () => {
      const response = await preview();

      expect(response.status).toBe(200);
      expect(slugs(response.body)).toEqual(['published', 'draft']);
      expect(response.body.totalCount).toBe(2);
   });

   it('ignores a wrong token', async () => {
      const response = await preview('wrong');

      expect(slugs(response.body)).toEqual(['published']);
   });

   it('does not take the URL signing key as the API token', async () => {
      const response = await preview(process.env.PREVIEW_URL_SIGNING_KEY);

      expect(slugs(response.body)).toEqual(['published']);
   });

   it('does not leak the drafts to the public list through the cache', async () => {
      await preview();

      const response = await getHttpServer().get('/public/services');

      expect(slugs(response.body)).toEqual(['published']);
   });

   it('does not serve a cached public list to a preview request', async () => {
      await getHttpServer().get('/public/services');

      const response = await preview();

      expect(slugs(response.body)).toEqual(['published', 'draft']);
   });
});
