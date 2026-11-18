import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp } from '../../setup/init';

describe('Native enum columns (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   afterEach(async () => {
      await prisma.service.deleteMany();
   });

   it('should reject a status outside the enum in the database', async () => {
      await expect(
         prisma.$executeRaw`INSERT INTO services (title, status, slug, updated_at) VALUES ('x', 'archived', 'x', now())`,
      ).rejects.toThrow(/invalid input value for enum entity_status/);
   });

   it('should keep the stored value of a valid status', async () => {
      await prisma.$executeRaw`INSERT INTO services (title, status, slug, updated_at) VALUES ('x', 'published', 'x', now())`;

      const service = await prisma.service.findUniqueOrThrow({ where: { slug: 'x' } });

      expect(service.status).toBe('published');
   });

   it('should default a new service to draft', async () => {
      const service = await prisma.service.create({ data: { title: 'x', slug: 'x' } });

      expect(service.status).toBe('draft');
   });

   it('should reject a language outside the enum in the database', async () => {
      const service = await prisma.service.create({ data: { title: 'x', slug: 'x' } });

      await expect(
         prisma.$executeRaw`INSERT INTO service_translations (service_id, language, title) VALUES (${service.id}, 'de', 'x')`,
      ).rejects.toThrow(/invalid input value for enum language/);
   });
});
