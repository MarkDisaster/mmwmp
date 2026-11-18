import { EntityStatus, Language } from '../../../prisma/generated/prisma/enums';
import { TEST_CONVERSATION_ID } from '../../../src/ai/tools/__tests__/tool-context.fixture';
import type { ToolContext } from '../../../src/ai/tools/tool-auth';
import { AuditContentTool } from '../../../src/content-insights/tools/audit-content.tool';
import { GetContentStatsTool } from '../../../src/content-insights/tools/get-content-stats.tool';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp } from '../../setup/init';
import { createTestUser } from '../../setup/users';

describe('AURORA content audit and statistics against the database (e2e)', () => {
   let prisma: PrismaService;
   let ctx: ToolContext;

   beforeAll(async () => {
      prisma = getApp().get(PrismaService);
      const user = await createTestUser({ email: 'insights@test.com' });
      ctx = {
         user: { id: user.id, role: { isAdmin: true, permissions: [] } },
         conversationId: TEST_CONVERSATION_ID,
      };
   });

   const cleanup = async () => {
      await prisma.projectMedia.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.serviceTranslation.deleteMany();
      await prisma.service.deleteMany();
      await prisma.fileVariant.deleteMany();
      await prisma.file.deleteMany();
   };

   beforeEach(cleanup);
   afterAll(cleanup);

   const image = (name: string, altText: string | null = null, deletedAt: Date | null = null) =>
      prisma.file.create({
         data: {
            filename: `${name}-stored`,
            originalName: name,
            mimeType: 'image/png',
            size: 100,
            storagePath: `files/${name}`,
            altText,
            deletedAt,
         },
      });

   it('counts the content problems, links the rows and leaves the trash out', async () => {
      const old = new Date(Date.now() - 40 * 24 * 3600 * 1000);
      const complete = await prisma.project.create({
         data: {
            title: 'Complete',
            slug: 'complete',
            status: EntityStatus.published,
            thumbnail: { create: await fileData('thumb', 'alt') },
            translations: {
               create: [Language.cs, Language.en].map((language) => ({
                  language,
                  title: 'Complete',
                  description: 'd',
                  content: 'c',
                  metaTitle: 't',
                  metaDescription: 'm',
               })),
            },
         },
      });
      const bare = await prisma.project.create({
         data: {
            title: 'Bare',
            slug: 'bare',
            status: EntityStatus.draft,
            createdAt: old,
            translations: { create: { language: Language.cs, title: 'Bare', metaTitle: '' } },
         },
      });
      await prisma.project.create({
         data: {
            title: 'Trashed',
            slug: 'trashed--trashed-99',
            originalSlug: 'trashed',
            deletedAt: new Date(),
         },
      });
      await prisma.service.create({
         data: { title: 'Svc', slug: 'svc', status: EntityStatus.published },
      });

      const result = await getApp().get(AuditContentTool).execute(ctx, {});

      const projects = result.projects;
      expect(projects?.withoutEnTranslation).toEqual({
         total: 1,
         items: [{ id: bare.id, name: 'Bare', adminUrl: `/projects/${bare.id}` }],
      });
      expect(projects?.withoutMetaTitle.items).toEqual([
         { id: bare.id, name: 'Bare', adminUrl: `/projects/${bare.id}`, detail: 'cs' },
      ]);
      expect(projects?.withoutThumbnail.total).toBe(1);
      expect(projects?.withoutDescription.total).toBe(1);
      expect(projects?.oldDrafts.items.map((i) => i.id)).toEqual([bare.id]);
      expect(projects?.publishedWithEmptyContent.total).toBe(0);
      expect(projects?.withoutEnTranslation.items.map((i) => i.id)).not.toContain(complete.id);
      expect(result.services?.withoutEnTranslation.total).toBe(1);
      expect(result.services?.publishedWithEmptyContent.total).toBe(1);
      expect(result.omitted).toEqual([]);
   });

   it('does not call a recent draft old and honours draftOlderThanDays', async () => {
      await prisma.project.create({ data: { title: 'New', slug: 'new-draft' } });

      const strict = await getApp()
         .get(AuditContentTool)
         .execute(ctx, { parts: ['projects'], draftOlderThanDays: 30 });
      expect(strict.projects?.oldDrafts.total).toBe(0);
      expect(strict).not.toHaveProperty('services');
   });

   it('lists images without alt text and unused files, never a trashed one', async () => {
      const noAlt = await image('no-alt.png');
      await image('empty-alt.png', '');
      await image('with-alt.png', 'popis');
      await image('trashed.png', null, new Date());

      const result = await getApp()
         .get(AuditContentTool)
         .execute(ctx, { parts: ['files'] });

      expect(result.files?.imagesWithoutAltText.total).toBe(2);
      expect(result.files?.imagesWithoutAltText.items[0]).toMatchObject({
         id: noAlt.id,
         name: 'no-alt.png',
      });
      expect(result.files?.unused.total).toBe(3);
   });

   it('counts projects by status and language, files by size and the latest audit entries', async () => {
      await prisma.project.create({
         data: {
            title: 'A',
            slug: 'a',
            status: EntityStatus.published,
            translations: { create: { language: Language.cs, title: 'A' } },
         },
      });
      await prisma.project.create({ data: { title: 'B', slug: 'b' } });
      await image('x.png');
      await prisma.auditLog.create({
         data: { actorType: 'user', action: 'project.create', resourceType: 'project' },
      });

      const result = await getApp().get(GetContentStatsTool).execute(ctx, {});

      expect(result.projects).toEqual({
         total: 2,
         byStatus: { draft: 1, published: 1 },
         byLanguage: { cs: 1, en: 0 },
      });
      expect(result.files).toMatchObject({ total: 1, totalSizeBytes: 100 });
      expect(result.users?.total).toBeGreaterThanOrEqual(1);
      expect(result.latestChanges?.length).toBeGreaterThanOrEqual(1);
   });

   it('omits the audit log for a role without audit_logs.read', async () => {
      const limited: ToolContext = {
         ...ctx,
         user: {
            id: ctx.user.id,
            role: { isAdmin: false, permissions: [{ resource: 'projects', action: 'read' }] },
         },
      };

      const result = await getApp()
         .get(GetContentStatsTool)
         .execute(limited, { parts: ['projects', 'latestChanges'] });

      expect(result).not.toHaveProperty('latestChanges');
      expect(result.omitted).toEqual([
         { part: 'latestChanges', missingPermission: 'audit_logs.read' },
      ]);
   });

   async function fileData(name: string, altText: string) {
      return {
         filename: `${name}-stored`,
         originalName: name,
         mimeType: 'image/png',
         size: 1,
         storagePath: `files/${name}`,
         altText,
      };
   }
});
