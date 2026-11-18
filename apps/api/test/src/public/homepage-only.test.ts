import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';

describe('Public lists: homepageOnly (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
   };

   beforeEach(async () => {
      await cleanupDb();
      await prisma.project.createMany({
         data: [
            {
               slug: 'on-homepage',
               title: 'On homepage',
               status: 'published',
               showOnHomepage: true,
            },
            { slug: 'elsewhere', title: 'Elsewhere', status: 'published', showOnHomepage: false },
         ],
      });
   });
   afterAll(cleanupDb);

   const slugs = (body: { data: Array<{ slug: string }> }) => body.data.map((p) => p.slug).sort();

   describe('GET /public/projects', () => {
      it('lists every published project without the flag', async () => {
         const response = await getHttpServer().get('/public/projects');

         expect(response.status).toBe(200);
         expect(slugs(response.body)).toEqual(['elsewhere', 'on-homepage']);
      });

      it('lists only homepage projects with homepageOnly=true', async () => {
         const response = await getHttpServer().get('/public/projects?homepageOnly=true');

         expect(response.status).toBe(200);
         expect(slugs(response.body)).toEqual(['on-homepage']);
      });

      it('lists everything with homepageOnly=false', async () => {
         const response = await getHttpServer().get('/public/projects?homepageOnly=false');

         expect(response.status).toBe(200);
         expect(slugs(response.body)).toEqual(['elsewhere', 'on-homepage']);
      });

      it.each(['1', 'True', 'yes', ''])('refuses homepageOnly=%j with 400', async (value) => {
         const response = await getHttpServer().get(`/public/projects?homepageOnly=${value}`);

         expect(response.status).toBe(400);
      });
   });

   describe('GET /public/services', () => {
      it('accepts a boolean flag', async () => {
         const response = await getHttpServer().get('/public/services?homepageOnly=true');

         expect(response.status).toBe(200);
      });

      it('refuses a value that is not a boolean with 400', async () => {
         const response = await getHttpServer().get('/public/services?homepageOnly=1');

         expect(response.status).toBe(400);
      });
   });
});
