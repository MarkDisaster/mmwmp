import type { PermissionAction, PermissionResource } from '../../../prisma/generated/prisma/enums';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createTestUser, loginAs } from '../../setup/users';

describe('File metadata and the publish permission (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.projectMedia.deleteMany();
      await prisma.project.deleteMany();
      await prisma.file.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { isSystem: false } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const createFile = () =>
      prisma.file.create({
         data: {
            filename: 'f.jpg',
            originalName: 'f.jpg',
            mimeType: 'image/jpeg',
            size: 1,
            storagePath: 'uploads/f.jpg',
         },
      });

   const patch = (token: string, id: number) =>
      getHttpServer()
         .patch(`/files/${id}`)
         .set('Authorization', `Bearer ${token}`)
         .send({ displayName: 'New alt' });

   const displayNameOf = async (id: number) =>
      (await prisma.file.findUniqueOrThrow({ where: { id } })).displayName;

   const login = async (publish: boolean) => {
      const grants: { resource: PermissionResource; action: PermissionAction }[] = [
         { resource: 'files', action: 'read' },
         { resource: 'files', action: 'update' },
         ...(publish ? [{ resource: 'projects', action: 'publish' } as const] : []),
      ];
      await prisma.role.create({ data: { name: 'files-editor', permissions: { create: grants } } });
      await createTestUser({ email: 'editor@test.com', role: 'files-editor' });
      return loginAs('editor@test.com');
   };

   it('lets an editor without publish change a file that no project uses', async () => {
      const token = await login(false);
      const file = await createFile();

      expect((await patch(token, file.id)).status).toBe(200);
      expect(await displayNameOf(file.id)).toBe('New alt');
   });

   it('lets an editor without publish change a file of a draft project', async () => {
      const token = await login(false);
      const file = await createFile();
      await prisma.project.create({
         data: { slug: 'draft', status: 'draft', thumbnailId: file.id },
      });

      expect((await patch(token, file.id)).status).toBe(200);
      expect(await displayNameOf(file.id)).toBe('New alt');
   });

   it.each(['thumbnail', 'media'])(
      'refuses an editor without publish for a file used as %s of a published project',
      async (usage) => {
         const token = await login(false);
         const file = await createFile();
         await prisma.project.create({
            data: {
               slug: 'live',
               status: 'published',
               publishedAt: new Date(),
               ...(usage === 'thumbnail'
                  ? { thumbnailId: file.id }
                  : { media: { create: { fileId: file.id } } }),
            },
         });

         const response = await patch(token, file.id);

         expect(response.status).toBe(403);
         expect(response.body.message).toBe(
            'Changing published content requires the publish permission',
         );
         expect(await displayNameOf(file.id)).toBeNull();
      },
   );

   it('lets a role with publish change a file of a published project', async () => {
      const token = await login(true);
      const file = await createFile();
      await prisma.project.create({
         data: { slug: 'live', status: 'published', publishedAt: new Date(), thumbnailId: file.id },
      });

      expect((await patch(token, file.id)).status).toBe(200);
      expect(await displayNameOf(file.id)).toBe('New alt');
   });

   it('answers 404 for a file that does not exist', async () => {
      const token = await login(true);

      expect((await patch(token, 999_999)).status).toBe(404);
   });
});
