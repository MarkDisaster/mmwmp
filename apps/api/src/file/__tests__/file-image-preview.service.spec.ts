import { VIEW_IMAGE_MAX_BYTES } from '@/ai/tools/limits';
import type { PrismaService } from '@/prisma/prisma.service';
import type { StorageService } from '@/storage/storage.service';

import { FileImagePreviewService } from '../file-image-preview.service';

const variant = (name: string, size: number) => ({
   variant: name,
   storagePath: `files/1/${name}.webp`,
   mimeType: 'image/webp',
   size,
   width: 800,
   height: 600,
});

describe('FileImagePreviewService', () => {
   let prisma: { file: { findFirst: jest.Mock } };
   let storage: { getBuffer: jest.Mock };
   let service: FileImagePreviewService;

   const file = (over: object = {}) => ({
      id: 1,
      originalName: 'a.png',
      displayName: null,
      altText: null,
      language: null,
      mimeType: 'image/png',
      processingStatus: 'READY',
      variants: [variant('medium', 50_000), variant('large', 120_000)],
      ...over,
   });

   beforeEach(() => {
      prisma = { file: { findFirst: jest.fn().mockResolvedValue(file()) } };
      storage = { getBuffer: jest.fn().mockResolvedValue(Buffer.from('x')) };
      service = new FileImagePreviewService(
         prisma as unknown as PrismaService,
         storage as unknown as StorageService,
      );
   });

   it('reads only a live file and asks only for the medium and large variants, never the original', async () => {
      await service.find(1, 'medium');

      const args = prisma.file.findFirst.mock.calls[0][0];
      expect(args.where).toEqual({ id: 1, deletedAt: null });
      expect(args.select.variants.where).toEqual({ variant: { in: ['medium', 'large'] } });
   });

   it('answers the requested size, with the name the admin shows', async () => {
      prisma.file.findFirst.mockResolvedValue(file({ displayName: 'Logo' }));

      const result = await service.find(1, 'large');

      expect(result).toMatchObject({
         found: true,
         preview: { variant: 'large', name: 'Logo', mimeType: 'image/webp' },
      });
   });

   it('falls back to medium when the large preview is over the byte cap', async () => {
      prisma.file.findFirst.mockResolvedValue(
         file({
            variants: [variant('medium', 50_000), variant('large', VIEW_IMAGE_MAX_BYTES + 1)],
         }),
      );

      expect(await service.find(1, 'large')).toMatchObject({
         found: true,
         preview: { variant: 'medium' },
      });
   });

   it('gives a reason for a missing file, a non-image, no variant yet and a too big preview', async () => {
      prisma.file.findFirst.mockResolvedValueOnce(null);
      expect(await service.find(1, 'medium')).toEqual({ found: false, reason: 'File not found' });

      prisma.file.findFirst.mockResolvedValueOnce(file({ mimeType: 'application/pdf' }));
      expect(await service.find(1, 'medium')).toEqual({
         found: false,
         reason: 'Not an image (application/pdf)',
      });

      prisma.file.findFirst.mockResolvedValueOnce(
         file({ variants: [], processingStatus: 'PENDING' }),
      );
      expect(await service.find(1, 'medium')).toEqual({
         found: false,
         reason: 'No preview variant (processing: PENDING)',
      });

      prisma.file.findFirst.mockResolvedValueOnce(
         file({ variants: [variant('medium', VIEW_IMAGE_MAX_BYTES + 1)] }),
      );
      expect(await service.find(1, 'medium')).toMatchObject({ found: false });
   });

   it('refuses bytes over the cap even when the stored size said otherwise', async () => {
      storage.getBuffer.mockResolvedValue(Buffer.alloc(VIEW_IMAGE_MAX_BYTES + 1));
      const lookup = await service.find(1, 'medium');
      if (!lookup.found) throw new Error('expected a preview');

      await expect(service.readBytes(lookup.preview)).rejects.toThrow('larger than');
   });
});
