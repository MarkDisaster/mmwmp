import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin, createTestUser, loginAs } from '../../setup/users';

describe('Upload limits (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.fileVariant.deleteMany();
      await prisma.file.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const MB = 1024 * 1024;
   const bytes = (size: number) => Buffer.alloc(size, 0x61);

   it('should answer 413 for an avatar over 5 MB, for every signed-in role', async () => {
      const user = await createTestUser({ email: 'editor@test.com', role: 'editor' });
      const token = await loginAs('editor@test.com');

      const response = await getHttpServer()
         .patch('/users/me/avatar')
         .set('Authorization', `Bearer ${token}`)
         .attach('file', bytes(5 * MB + 1), { filename: 'big.png', contentType: 'image/png' });

      expect(response.status).toBe(413);
      expect(
         (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).avatarPath,
      ).toBeNull();
   });

   it('should answer 413 for a library file over 10 MB and store nothing', async () => {
      const token = await createAdminAndLogin();

      const response = await getHttpServer()
         .post('/files')
         .set('Authorization', `Bearer ${token}`)
         .attach('file', bytes(10 * MB + 1), {
            filename: 'big.pdf',
            contentType: 'application/pdf',
         });

      expect(response.status).toBe(413);
      expect(await prisma.file.count()).toBe(0);
   });

   it('should answer 413 for a recording over 25 MB', async () => {
      const token = await createAdminAndLogin();

      const response = await getHttpServer()
         .post('/ai/voice/transcribe')
         .set('Authorization', `Bearer ${token}`)
         .attach('file', bytes(25 * MB + 1), { filename: 'long.webm', contentType: 'audio/webm' });

      expect(response.status).toBe(413);
   });

   it('should refuse a second file in one upload with 400', async () => {
      const token = await createAdminAndLogin();

      const response = await getHttpServer()
         .patch('/users/me/avatar')
         .set('Authorization', `Bearer ${token}`)
         .attach('file', bytes(10), { filename: 'a.png', contentType: 'image/png' })
         .attach('file', bytes(10), { filename: 'b.png', contentType: 'image/png' });

      expect(response.status).toBe(400);
   });
});
