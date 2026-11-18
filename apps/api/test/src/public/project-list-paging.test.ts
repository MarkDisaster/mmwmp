import { CacheService } from '../../../src/cache/cache.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';

describe('Public project list paging (e2e)', () => {
   const TOTAL = 7;
   const LIMIT = 3;
   let prisma: PrismaService;
   let cache: CacheService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
      cache = getApp().get(CacheService);
   });

   const cleanupDb = async () => {
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
   };

   beforeEach(async () => {
      await cleanupDb();
      await cache.delPattern('projects:*');
      await prisma.project.createMany({
         data: Array.from({ length: TOTAL }, (_, i) => ({
            slug: `tied-${i}`,
            title: `Tied ${i}`,
            status: 'published',
            sortOrder: 0,
         })),
      });
   });
   afterAll(cleanupDb);

   const fetchPage = async (page: number) => {
      const response = await getHttpServer().get(`/public/projects?page=${page}&limit=${LIMIT}`);
      expect(response.status).toBe(200);
      return response.body as { data: Array<{ id: number }>; totalCount: number };
   };

   it('lists every project exactly once across the pages', async () => {
      const pages = await Promise.all([fetchPage(0), fetchPage(1), fetchPage(2)]);

      expect(pages.map((p) => p.data.length)).toEqual([3, 3, 1]);
      expect(pages.every((p) => p.totalCount === TOTAL)).toBe(true);

      const ids = pages.flatMap((p) => p.data.map((project) => project.id));
      expect(new Set(ids).size).toBe(TOTAL);
   });

   it('breaks ties by id, so the order is the same on every request', async () => {
      await prisma.$executeRaw`TRUNCATE projects CASCADE`;
      await prisma.project.createMany({
         data: Array.from({ length: TOTAL }, (_, i) => ({
            id: TOTAL - i,
            slug: `desc-${TOTAL - i}`,
            title: `Desc ${TOTAL - i}`,
            status: 'published',
            sortOrder: 0,
         })),
      });

      const first = await fetchPage(0);
      await cache.delPattern('projects:*');
      const second = await fetchPage(0);

      expect(first.data.map((project) => project.id)).toEqual([1, 2, 3]);
      expect(second.data.map((project) => project.id)).toEqual([1, 2, 3]);
   });

   it('lists and counts only the projects translated into the Accept-Language', async () => {
      const translated = (await prisma.project.findMany({ orderBy: { id: 'asc' }, take: 3 })).map(
         (project) => project.id,
      );
      await prisma.projectTranslation.createMany({
         data: translated.map((projectId) => ({ projectId, language: 'en', title: 'Translated' })),
      });

      const response = await getHttpServer()
         .get(`/public/projects?page=0&limit=${LIMIT}`)
         .set('Accept-Language', 'en');
      const next = await getHttpServer()
         .get(`/public/projects?page=1&limit=${LIMIT}`)
         .set('Accept-Language', 'en');

      expect(response.status).toBe(200);
      expect(response.body.totalCount).toBe(3);
      expect(response.body.data.map((project: { id: number }) => project.id)).toEqual(translated);
      expect(next.body.data).toEqual([]);
   });
});
