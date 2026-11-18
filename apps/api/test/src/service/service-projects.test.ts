import { PrismaService } from '../../../src/prisma/prisma.service';
import { ServiceService } from '../../../src/service/service.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin } from '../../setup/users';

const PUBLISHER = { userId: 0, canPublish: true };

describe('Service projects, one at a time (AI tools addServiceProject / removeServiceProject)', () => {
   let prisma: PrismaService;
   let services: ServiceService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
      services = getApp().get(ServiceService);
   });

   const cleanupDb = async () => {
      await prisma.serviceProject.deleteMany();
      await prisma.serviceTranslation.deleteMany();
      await prisma.service.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const create = async (token: string, kind: 'projects' | 'services', slug: string) => {
      const response = await getHttpServer()
         .post(`/${kind}`)
         .set('Authorization', `Bearer ${token}`)
         .send({ title: slug, slug, language: 'cs' });
      expect(response.status).toBe(201);
      return response.body as { id: number };
   };

   const projectIdsOf = async (serviceId: number) =>
      (
         await prisma.serviceProject.findMany({
            where: { serviceId },
            orderBy: { sortOrder: 'asc' },
         })
      ).map(({ projectId }) => projectId);

   it('should link the project last and keep the others', async () => {
      const token = await createAdminAndLogin();
      const service = await create(token, 'services', 'web');
      const a = await create(token, 'projects', 'a');
      const b = await create(token, 'projects', 'b');
      const c = await create(token, 'projects', 'c');
      await services.assignProjects(service.id, { projectIds: [b.id, a.id] }, PUBLISHER);

      const result = await services.addProject(service.id, c.id, PUBLISHER);

      expect(result.added).toBe(true);
      expect(result.service.projects.map(({ project }) => project.id)).toEqual([b.id, a.id, c.id]);
      expect(await projectIdsOf(service.id)).toEqual([b.id, a.id, c.id]);
   });

   it('should change nothing for a project the service already has', async () => {
      const token = await createAdminAndLogin();
      const service = await create(token, 'services', 'web');
      const a = await create(token, 'projects', 'a');
      await services.addProject(service.id, a.id, PUBLISHER);

      const result = await services.addProject(service.id, a.id, PUBLISHER);

      expect(result.added).toBe(false);
      expect(await projectIdsOf(service.id)).toEqual([a.id]);
   });

   it('should reject an unknown project and an unknown service', async () => {
      const token = await createAdminAndLogin();
      const service = await create(token, 'services', 'web');
      const a = await create(token, 'projects', 'a');

      await expect(services.addProject(service.id, a.id + 1000, PUBLISHER)).rejects.toThrow(
         'Project not found',
      );
      await expect(services.addProject(service.id + 1000, a.id, PUBLISHER)).rejects.toThrow(
         'Service not found',
      );
      expect(await projectIdsOf(service.id)).toEqual([]);
   });

   it('should unlink one project and keep the others, and change nothing the second time', async () => {
      const token = await createAdminAndLogin();
      const service = await create(token, 'services', 'web');
      const a = await create(token, 'projects', 'a');
      const b = await create(token, 'projects', 'b');
      await services.assignProjects(service.id, { projectIds: [a.id, b.id] }, PUBLISHER);

      const first = await services.removeProject(service.id, a.id, PUBLISHER);
      const again = await services.removeProject(service.id, a.id, PUBLISHER);

      expect(first.removed).toBe(true);
      expect(again.removed).toBe(false);
      expect(await projectIdsOf(service.id)).toEqual([b.id]);
      expect(await prisma.project.count({ where: { id: a.id } })).toBe(1);
   });
});
