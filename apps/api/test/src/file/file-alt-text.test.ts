import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin } from '../../setup/users';

describe('File alt text (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.projectMedia.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.file.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
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

   const patch = (token: string, id: number, data: Record<string, unknown>) =>
      getHttpServer().patch(`/files/${id}`).set('Authorization', `Bearer ${token}`).send(data);

   it('is null by default, saved trimmed and returned by the file endpoints', async () => {
      const token = await createAdminAndLogin();
      const file = await createFile();

      const fresh = await getHttpServer()
         .get(`/files/${file.id}`)
         .set('Authorization', `Bearer ${token}`);
      expect(fresh.body.altText).toBeNull();

      const response = await patch(token, file.id, { altText: '  Portrét autora  ' });

      expect(response.status).toBe(200);
      expect(response.body.altText).toBe('Portrét autora');
      const list = await getHttpServer().get('/files').set('Authorization', `Bearer ${token}`);
      expect(list.body.data[0].altText).toBe('Portrét autora');
   });

   it('stores an empty string and null as null, and leaves it when omitted', async () => {
      const token = await createAdminAndLogin();
      const file = await createFile();
      await patch(token, file.id, { altText: 'Popis' }).expect(200);

      await patch(token, file.id, { displayName: 'Jen název' }).expect(200);
      expect((await prisma.file.findUniqueOrThrow({ where: { id: file.id } })).altText).toBe(
         'Popis',
      );

      await patch(token, file.id, { altText: '   ' }).expect(200);
      expect((await prisma.file.findUniqueOrThrow({ where: { id: file.id } })).altText).toBeNull();

      await patch(token, file.id, { altText: 'Znovu' }).expect(200);
      await patch(token, file.id, { altText: null }).expect(200);
      expect((await prisma.file.findUniqueOrThrow({ where: { id: file.id } })).altText).toBeNull();
   });

   it('accepts 300 characters and refuses 301', async () => {
      const token = await createAdminAndLogin();
      const file = await createFile();

      await patch(token, file.id, { altText: 'a'.repeat(300) }).expect(200);
      expect((await patch(token, file.id, { altText: 'a'.repeat(301) })).status).toBe(400);
      expect((await patch(token, file.id, { altText: 5 })).status).toBe(400);
   });

   it('is in the public project payload (thumbnail and media), not the storage columns', async () => {
      const token = await createAdminAndLogin();
      const file = await createFile();
      await patch(token, file.id, { altText: 'Obrazovka aplikace' }).expect(200);
      await prisma.project.create({
         data: {
            slug: 'with-image',
            status: 'published',
            thumbnailId: file.id,
            media: { create: { fileId: file.id } },
            translations: { create: { language: 'cs', title: 'S obrázkem' } },
         },
      });

      const response = await getHttpServer().get('/public/projects/with-image');

      expect(response.status).toBe(200);
      expect(response.body.thumbnail.altText).toBe('Obrazovka aplikace');
      expect(response.body.media[0].file.altText).toBe('Obrazovka aplikace');
      expect(response.body.thumbnail).not.toHaveProperty('storagePath');
   });
});
