import { EntityStatus, SlugRedirectResource } from '../../../prisma/generated/prisma/enums';
import { TEST_CONVERSATION_ID } from '../../../src/ai/tools/__tests__/tool-context.fixture';
import type { ToolContext } from '../../../src/ai/tools/tool-auth';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { DeleteSlugRedirectTool } from '../../../src/slug-redirect/tools/delete-slug-redirect.tool';
import { ListSlugRedirectsTool } from '../../../src/slug-redirect/tools/list-slug-redirects.tool';
import { getApp } from '../../setup/init';
import { createTestUser } from '../../setup/users';

describe('AURORA slug redirect tools against the database (e2e)', () => {
   let prisma: PrismaService;
   let ctx: ToolContext;

   beforeAll(async () => {
      prisma = getApp().get(PrismaService);
      const user = await createTestUser({ email: 'redirects@test.com' });
      ctx = {
         user: { id: user.id, role: { isAdmin: true, permissions: [] } },
         conversationId: TEST_CONVERSATION_ID,
      };
   });

   const cleanup = async () => {
      await prisma.slugRedirect.deleteMany();
      await prisma.project.deleteMany();
      await prisma.service.deleteMany();
   };

   beforeEach(cleanup);
   afterAll(cleanup);

   it('lists redirects of one resource with the state of the target', async () => {
      const live = await prisma.project.create({
         data: { title: 'Live', slug: 'live', status: EntityStatus.published },
      });
      const draft = await prisma.project.create({ data: { title: 'Draft', slug: 'draft' } });
      await prisma.slugRedirect.createMany({
         data: [
            { resource: SlugRedirectResource.project, oldSlug: 'was-live', targetId: live.id },
            { resource: SlugRedirectResource.project, oldSlug: 'was-draft', targetId: draft.id },
            { resource: SlugRedirectResource.service, oldSlug: 'svc-old', targetId: 1 },
         ],
      });

      const result = await getApp().get(ListSlugRedirectsTool).execute(ctx, { type: 'project' });

      expect(result.total).toBe(2);
      expect(result.items.map((i) => [i.oldSlug, i.targetState, i.adminUrl])).toEqual(
         expect.arrayContaining([
            ['was-live', 'published', `/projects/${live.id}`],
            ['was-draft', 'draft', `/projects/${draft.id}`],
         ]),
      );
   });

   it('deletes one redirect, leaves the others and refuses a changed slug', async () => {
      const [a, b] = await Promise.all(
         ['a-old', 'b-old'].map((oldSlug) =>
            prisma.slugRedirect.create({
               data: { resource: SlugRedirectResource.project, oldSlug, targetId: 1 },
            }),
         ),
      );
      const tool = getApp().get(DeleteSlugRedirectTool);

      await expect(
         tool.execute(ctx, { type: 'project', id: a.id, oldSlug: 'nope' }),
      ).rejects.toThrow('List the redirects again');
      await expect(
         tool.execute(ctx, { type: 'service', id: a.id, oldSlug: 'a-old' }),
      ).rejects.toThrow('There is no service slug redirect');

      const result = await tool.execute(ctx, { type: 'project', id: a.id, oldSlug: 'a-old' });

      expect(result).toEqual({ type: 'project', id: a.id, oldSlug: 'a-old', deleted: true });
      expect(await prisma.slugRedirect.findUnique({ where: { id: a.id } })).toBeNull();
      expect(await prisma.slugRedirect.findUnique({ where: { id: b.id } })).not.toBeNull();
   });
});
