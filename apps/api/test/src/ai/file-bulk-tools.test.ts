import { adminContext } from '../../../src/ai/tools/__tests__/tool-context.fixture';
import { DeleteFilesTool } from '../../../src/file/tools/delete-files.tool';
import { FindUnusedFilesTool } from '../../../src/file/tools/find-unused-files.tool';
import { UpdateFilesTool } from '../../../src/file/tools/update-files.tool';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp } from '../../setup/init';
import { createTestUser } from '../../setup/users';

describe('AURORA bulk file tools against the database (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanup = async () => {
      await prisma.projectMedia.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.fileVariant.deleteMany();
      await prisma.file.deleteMany();
   };

   beforeEach(cleanup);
   afterAll(cleanup);

   const file = (name: string, size = 100, displayName: string | null = null) =>
      prisma.file.create({
         data: {
            filename: `${name}-stored`,
            originalName: name,
            displayName,
            mimeType: 'image/png',
            size,
            storagePath: `files/${name}`,
         },
      });

   it('renames many files in one transaction and checks the current names', async () => {
      const [a, b] = await Promise.all([file('screencapture-a.png'), file('screencapture-b.png')]);
      const tool = getApp().get(UpdateFilesTool);

      const result = await tool.execute(adminContext(), {
         files: [
            { id: a.id, currentName: 'screencapture-a.png', displayName: 'a.png' },
            { id: b.id, currentName: 'screencapture-b.png', displayName: 'b.png' },
         ],
      });

      expect(result).toMatchObject({ applied: true, updatedCount: 2, failed: [] });
      expect((await prisma.file.findUniqueOrThrow({ where: { id: a.id } })).displayName).toBe(
         'a.png',
      );
   });

   it('changes nothing when one file fails, and says which and why', async () => {
      const a = await file('one.png');
      const tool = getApp().get(UpdateFilesTool);

      const result = await tool.execute(adminContext(), {
         files: [
            { id: a.id, currentName: 'one.png', displayName: 'uno.png' },
            { id: a.id + 999, currentName: 'ghost.png', displayName: 'x.png' },
         ],
      });

      expect(result).toMatchObject({
         applied: false,
         updated: [],
         failed: [{ id: a.id + 999, reason: 'File not found' }],
      });
      expect((await prisma.file.findUniqueOrThrow({ where: { id: a.id } })).displayName).toBeNull();
   });

   it('refuses a file renamed meanwhile (the approved summary would be stale)', async () => {
      const a = await file('one.png', 100, 'already-renamed.png');

      const result = await getApp()
         .get(UpdateFilesTool)
         .execute(adminContext(), {
            files: [{ id: a.id, currentName: 'one.png', displayName: 'x.png' }],
         });

      expect(result.applied).toBe(false);
      expect(result.failed[0].reason).toContain('already-renamed.png');
   });

   it('sets the alt text of many files in one transaction and clears it with an empty text', async () => {
      const [a, b] = await Promise.all([file('a.png'), file('b.png')]);
      await prisma.file.update({ where: { id: b.id }, data: { altText: 'old' } });

      const result = await getApp()
         .get(UpdateFilesTool)
         .execute(adminContext(), {
            files: [
               { id: a.id, currentName: 'a.png', altText: '  Logo firmy  ' },
               { id: b.id, currentName: 'b.png', altText: '' },
            ],
         });

      expect(result).toMatchObject({ applied: true, updatedCount: 2 });
      expect((await prisma.file.findUniqueOrThrow({ where: { id: a.id } })).altText).toBe(
         'Logo firmy',
      );
      expect((await prisma.file.findUniqueOrThrow({ where: { id: b.id } })).altText).toBeNull();
   });

   it('finds the files no project uses and moves them to the trash, an attached one as well', async () => {
      const [unused, used] = await Promise.all([file('unused.png', 500), file('used.png', 300)]);
      const project = await prisma.project.create({
         data: {
            slug: 'p',
            title: 'P',
            translations: { create: [{ language: 'cs', title: 'P' }] },
         },
      });
      await prisma.projectMedia.create({
         data: { projectId: project.id, fileId: used.id, sortOrder: 0 },
      });

      const found = await getApp().get(FindUnusedFilesTool).execute(adminContext(), {});
      expect(found).toMatchObject({ total: 1, totalSizeBytes: 500 });
      expect(found.items.map(({ id }) => id)).toEqual([unused.id]);

      const admin = await createTestUser({ email: 'bulk-trash-admin@test.com' });
      const actor = adminContext();
      const deleted = await getApp()
         .get(DeleteFilesTool)
         .execute(
            { ...actor, user: { ...actor.user, id: admin.id } },
            {
               files: [
                  { id: unused.id, name: 'unused.png', sizeBytes: 500 },
                  { id: used.id, name: 'used.png', sizeBytes: 300 },
               ],
            },
         );
      expect(deleted).toMatchObject({ deletedCount: 2, applied: true });
      expect(deleted.failed).toEqual([]);
      const trashed = await prisma.file.findMany({
         where: { id: { in: [unused.id, used.id] } },
         select: { deletedAt: true },
      });
      expect(trashed.every(({ deletedAt }) => deletedAt !== null)).toBe(true);
   });
});
