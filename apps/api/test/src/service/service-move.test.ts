import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp } from '../../setup/init';
import {
   describeManualOrder,
   describePublishedOrder,
   manualOrderClient,
   type ManualOrderResource,
} from '../../setup/manual-order';
import { createAdminAndLogin } from '../../setup/users';

const services: ManualOrderResource = {
   table: 'services',
   createBody: (slug) => ({ title: slug, slug, language: 'cs' }),
};

describe('Service ordering (e2e)', () => {
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
      await prisma.role.deleteMany({ where: { name: 'viewer' } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   describeManualOrder(services);
   describePublishedOrder(services);

   const { create: createService } = manualOrderClient(services);

   it('should have no upper limit on the number of services', async () => {
      const token = await createAdminAndLogin();
      await prisma.service.createMany({
         data: Array.from({ length: 101 }, (_, i) => ({
            title: `s${i}`,
            slug: `s${i}`,
            sortOrder: i,
         })),
      });

      const created = await createService(token, 'extra');

      expect(created.sortOrder).toBe(101);
   });
});
