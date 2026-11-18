import sharp from 'sharp';

import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createTestUser, loginAs } from '../../setup/users';

describe('PATCH /users/me/avatar (e2e)', () => {
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

   const image = () =>
      sharp({ create: { width: 64, height: 64, channels: 3, background: '#808080' } });

   const upload = async (bytes: Buffer, contentType: string) => {
      const user = await createTestUser({ email: 'editor@test.com', role: 'editor' });
      const token = await loginAs('editor@test.com');
      const response = await getHttpServer()
         .patch('/users/me/avatar')
         .set('Authorization', `Bearer ${token}`)
         .attach('file', bytes, { filename: 'avatar.png', contentType });
      const { avatarPath } = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return { response, avatarPath };
   };

   it('should refuse a TIFF declared as PNG with 400 and store nothing', async () => {
      const { response, avatarPath } = await upload(await image().tiff().toBuffer(), 'image/png');

      expect(response.status).toBe(400);
      expect(avatarPath).toBeNull();
   });

   it('should accept a PNG whatever type the client declares', async () => {
      const { response, avatarPath } = await upload(
         await image().png().toBuffer(),
         'application/octet-stream',
      );

      expect(response.status).toBe(200);
      expect(avatarPath).toMatch(/^avatars\/\d+\/avatar-\d+\.webp$/);
   });

   it('should answer 400 without a file', async () => {
      await createTestUser({ email: 'editor@test.com', role: 'editor' });
      const token = await loginAs('editor@test.com');

      const response = await getHttpServer()
         .patch('/users/me/avatar')
         .set('Authorization', `Bearer ${token}`)
         .field('name', 'x');

      expect(response.status).toBe(400);
   });
});
