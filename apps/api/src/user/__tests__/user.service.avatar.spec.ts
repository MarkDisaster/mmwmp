import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

import type { PrismaService } from '@/prisma/prisma.service';
import type { StorageService } from '@/storage/storage.service';

import { createPngClaiming } from '../../../test/setup/files';
import { UserService } from '../user.service';

const upload = (buffer: Buffer) =>
   ({ buffer, size: buffer.length, mimetype: 'image/png' }) as Express.Multer.File;

describe('UserService.updateAvatar', () => {
   let storage: { uploadBuffer: jest.Mock; delete: jest.Mock };
   let service: UserService;

   beforeEach(() => {
      storage = {
         uploadBuffer: jest.fn().mockResolvedValue(undefined),
         delete: jest.fn().mockResolvedValue(undefined),
      };
      const prisma = {
         user: {
            findFirst: jest.fn().mockResolvedValue({ avatarPath: null }),
            update: jest.fn().mockResolvedValue({}),
         },
      };
      service = new UserService(
         prisma as unknown as PrismaService,
         storage as unknown as StorageService,
      );
      jest.spyOn(service, 'findOne').mockResolvedValue({} as never);
   });

   it('answers 400 for an image over the pixel limit and stores nothing', async () => {
      await expect(
         service.updateAvatar(1, upload(createPngClaiming(20_000, 20_000))),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.uploadBuffer).not.toHaveBeenCalled();
   });

   it('answers 400 for bytes that are not an image', async () => {
      await expect(
         service.updateAvatar(1, upload(Buffer.from('not an image'))),
      ).rejects.toBeInstanceOf(BadRequestException);
   });

   it('stores a 256 px WebP of a readable image', async () => {
      const png = await sharp({
         create: { width: 600, height: 400, channels: 3, background: '#808080' },
      })
         .png()
         .toBuffer();

      await service.updateAvatar(1, upload(png));

      const [stored, , type] = storage.uploadBuffer.mock.calls[0] as [Buffer, string, string];
      expect(type).toBe('image/webp');
      const meta = await sharp(stored).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(['webp', 256, 256]);
   });
});
