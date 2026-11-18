import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp } from '../../setup/init';
import {
   describeManualOrder,
   describePublishedOrder,
   manualOrderClient,
   type ManualOrderResource,
} from '../../setup/manual-order';
import { createAdminAndLogin } from '../../setup/users';

const projects: ManualOrderResource = {
   table: 'projects',
   createBody: (slug) => ({ title: slug, slug, language: 'cs' }),
};

describe('Project ordering (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectTranslation.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.projectMedia.deleteMany();
      await prisma.project.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { name: 'viewer' } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   describeManualOrder(projects);
   describePublishedOrder(projects);

   const { create: createProject } = manualOrderClient(projects);

   it('should have no upper limit on the number of projects', async () => {
      const token = await createAdminAndLogin();
      await prisma.project.createMany({
         data: Array.from({ length: 101 }, (_, i) => ({
            title: `p${i}`,
            slug: `p${i}`,
            sortOrder: i,
         })),
      });

      const created = await createProject(token, 'extra');

      expect(created.sortOrder).toBe(101);
   });
});
