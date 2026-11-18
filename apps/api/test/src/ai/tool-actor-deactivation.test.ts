import { toolOptions } from '../../../src/ai/tools/__tests__/tool-context.fixture';
import { AiToolRegistryService } from '../../../src/ai/tools/ai-tool-registry.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp } from '../../setup/init';
import { createTestUser } from '../../setup/users';

type SdkTool = { execute: (input: unknown, options: unknown) => Promise<unknown> };

describe('AURORA tools after the account is deactivated (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const listUsers = () => getApp().get(AiToolRegistryService).getToolSet().listUsers as SdkTool;

   const context = (userId: number) =>
      toolOptions({
         user: { id: userId, role: { isAdmin: true, permissions: [] } },
         conversationId: 'conv-e2e',
      });

   it.each([
      ['deactivated', { deactivatedAt: new Date() }],
      ['deleted', { deletedAt: new Date() }],
   ])('should refuse the next tool call once the user is %s', async (_label, change) => {
      const admin = await createTestUser();
      await expect(listUsers().execute({}, context(admin.id))).resolves.toMatchObject({
         total: 1,
      });

      await prisma.user.update({ where: { id: admin.id }, data: change });

      await expect(listUsers().execute({}, context(admin.id))).rejects.toThrow(
         'Your account is no longer active',
      );
   });
});
