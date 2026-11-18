import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { names } from '../../setup/tags';
import { createTestUser } from '../../setup/users';

const INTERNAL_FILE_FIELDS = [
   'storagePath',
   'originalName',
   'filename',
   'createdById',
   'createdBy',
   'processingStatus',
   'processingError',
];

describe('Public endpoints without drafts or internal fields (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.serviceProject.deleteMany();
      await prisma.serviceTranslation.deleteMany();
      await prisma.service.deleteMany();
      await prisma.projectMedia.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.fileVariant.deleteMany();
      await prisma.file.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const seed = async () => {
      const author = await createTestUser({ email: 'author@test.com' });
      const file = await prisma.file.create({
         data: {
            filename: 'internal-name.jpg',
            originalName: 'C:\\Users\\author\\secret-holiday.jpg',
            displayName: 'Screenshot',
            mimeType: 'image/jpeg',
            size: 1024,
            storagePath: 'projects/internal-key.jpg',
            processingError: 'internal stack trace',
            createdById: author.id,
            variants: {
               create: {
                  variant: 'large',
                  storagePath: 'projects/internal-key-large.jpg',
                  mimeType: 'image/webp',
                  size: 512,
               },
            },
         },
      });
      const liveTag = await prisma.tag.create({
         data: { translations: names('Live', 'Live EN'), slug: 'live', createdById: author.id },
      });
      const plainTag = await prisma.tag.create({
         data: { translations: names('Plain'), slug: 'plain', sortOrder: 1 },
      });
      const trashedTag = await prisma.tag.create({
         data: {
            translations: names('Secret'),
            slug: 'secret--trashed-1',
            originalSlug: 'secret',
            deletedAt: new Date(),
            sortOrder: 2,
         },
      });
      const live = await prisma.project.create({
         data: {
            title: 'Live',
            slug: 'live-project',
            status: 'published',
            createdById: author.id,
            thumbnailId: file.id,
            translations: { create: { language: 'cs', title: 'Live' } },
            tags: {
               create: [
                  { tagId: liveTag.id, sortOrder: 0 },
                  { tagId: plainTag.id, sortOrder: 1 },
                  { tagId: trashedTag.id, sortOrder: 2 },
               ],
            },
            media: { create: { fileId: file.id, sortOrder: 0 } },
         },
      });
      const draft = await prisma.project.create({
         data: {
            title: 'Unannounced',
            slug: 'unannounced-project',
            sortOrder: 1,
            translations: { create: { language: 'cs', title: 'Unannounced' } },
            tags: { create: { tagId: liveTag.id, sortOrder: 0 } },
         },
      });
      await prisma.service.create({
         data: {
            title: 'Web',
            slug: 'web',
            status: 'published',
            createdById: author.id,
            translations: { create: { language: 'cs', title: 'Web' } },
            projects: {
               create: [
                  { projectId: live.id, sortOrder: 0 },
                  { projectId: draft.id, sortOrder: 1 },
               ],
            },
         },
      });
      return { live, draft };
   };

   const expectNoInternalFileFields = (file: Record<string, unknown>) => {
      for (const field of INTERNAL_FILE_FIELDS) expect(file).not.toHaveProperty(field);
      for (const variant of file.variants as Record<string, unknown>[]) {
         expect(variant).not.toHaveProperty('storagePath');
         expect(variant.publicUrl).toEqual(expect.stringContaining('internal-key-large.jpg'));
      }
   };

   it('should list every tag outside the trash and count only published projects', async () => {
      await seed();

      const response = await getHttpServer().get('/public/tags');

      expect(response.status).toBe(200);
      expect(response.body.totalCount).toBe(2);
      expect(response.body.data).toEqual([
         expect.objectContaining({ slug: 'live', _count: { projects: 1 } }),
         expect.objectContaining({ slug: 'plain', _count: { projects: 1 } }),
      ]);
      expect(response.body.data[0]).not.toHaveProperty('createdById');
      for (const tag of response.body.data) {
         for (const column of [
            'deletedAt',
            'deletedById',
            'originalName',
            'originalSlug',
            'status',
            'name',
         ]) {
            expect(tag).not.toHaveProperty(column);
         }
      }
   });

   it('should return a project with its tags outside the trash and public file fields', async () => {
      await seed();

      const detail = await getHttpServer().get('/public/projects/live-project');
      const list = await getHttpServer().get('/public/projects');

      expect(detail.status).toBe(200);
      expect(list.body.data).toHaveLength(1);
      for (const project of [detail.body, list.body.data[0]]) {
         expect(project.tags.map(({ tag }: { tag: { slug: string } }) => tag.slug)).toEqual([
            'live',
            'plain',
         ]);
         expect(project).not.toHaveProperty('createdById');
         expect(project).not.toHaveProperty('createdBy');
         expect(project.tags[0].tag).not.toHaveProperty('createdById');
         expectNoInternalFileFields(project.thumbnail);
         expect(project.thumbnail.displayName).toBe('Screenshot');
         expectNoInternalFileFields(project.media[0].file);
      }
   });

   it('should list only published projects of a service, its detail too', async () => {
      await seed();

      const detail = await getHttpServer().get('/public/services/web');
      const list = await getHttpServer().get('/public/services');

      expect(detail.status).toBe(200);
      for (const service of [detail.body, list.body.data[0]]) {
         expect(
            service.projects.map(({ project }: { project: { slug: string } }) => project.slug),
         ).toEqual(['live-project']);
         expect(service).not.toHaveProperty('createdById');
      }
      expect(JSON.stringify(detail.body)).not.toContain('unannounced');
   });

   it('should still list the draft projects of a service in preview mode', async () => {
      await seed();

      const response = await getHttpServer()
         .get('/public/services/web')
         .set('Authorization', `Bearer ${process.env.PREVIEW_API_TOKEN}`);

      expect(response.status).toBe(200);
      expect(
         response.body.projects.map(({ project }: { project: { slug: string } }) => project.slug),
      ).toEqual(['live-project', 'unannounced-project']);
   });
});
