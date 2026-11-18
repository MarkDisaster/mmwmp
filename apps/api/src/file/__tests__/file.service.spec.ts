import { BadRequestException } from '@nestjs/common';

import type { CacheService } from '@/cache/cache.service';
import { FileProcessingStatus, FileVariantType } from '@/generated/prisma/enums';
import type { PrismaService } from '@/prisma/prisma.service';
import type { RevalidationService } from '@/revalidation/revalidation.service';
import { InvalidImageError } from '@/storage/invalid-image.error';
import type { StorageService } from '@/storage/storage.service';

import { FileService } from '../file.service';
import type { FileThumbnailQueue } from '../file-thumbnail.queue';
import type { DetectedFile } from '../pipes/detected-file-type.pipe';

describe('FileService.uploadImage', () => {
   const MULTER_FILE = {
      buffer: Buffer.from('img'),
      mimetype: 'image/png',
      detectedMimeType: 'image/png',
      originalname: 'cat.png',
      size: 3,
   } as DetectedFile;

   type PrismaMock = { file: { create: jest.Mock; updateMany: jest.Mock } };
   type StorageMock = {
      isImage: jest.Mock;
      uploadOriginalImage: jest.Mock;
      upload: jest.Mock;
      deleteFolder: jest.Mock;
      getPublicUrl: jest.Mock;
   };
   type QueueMock = { process: jest.Mock };

   let prisma: PrismaMock;
   let storage: StorageMock;
   let queue: QueueMock;
   let service: FileService;

   beforeEach(() => {
      prisma = {
         file: {
            create: jest.fn(),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
         },
      };
      storage = {
         isImage: jest.fn().mockReturnValue(true),
         uploadOriginalImage: jest.fn().mockResolvedValue({
            variant: FileVariantType.original,
            storagePath: 'uploads/uuid/original',
            mimeType: 'image/png',
            size: 3,
            width: 100,
            height: 100,
         }),
         upload: jest.fn().mockResolvedValue({
            key: 'uploads/uuid/original.pdf',
            width: null,
            height: null,
         }),
         deleteFolder: jest.fn().mockResolvedValue(undefined),
         getPublicUrl: jest.fn((p: string) => `https://cdn/${p}`),
      };
      queue = { process: jest.fn().mockResolvedValue(undefined) };

      service = new FileService(
         prisma as unknown as PrismaService,
         storage as unknown as StorageService,
         queue as unknown as FileThumbnailQueue,
         { delPattern: jest.fn() } as unknown as CacheService,
         { revalidate: jest.fn() } as unknown as RevalidationService,
         { publish: jest.fn() } as never,
         { get: jest.fn((_key: string, fallback: unknown) => fallback) } as never,
      );
   });

   const buildCreatedFile = () => ({
      id: 7,
      filename: 'uuid',
      originalName: 'cat.png',
      displayName: null,
      mimeType: 'image/png',
      size: 3,
      width: 100,
      height: 100,
      storagePath: 'uploads/uuid',
      language: null,
      processingStatus: FileProcessingStatus.PENDING,
      processingError: null,
      createdById: 1,
      createdBy: { id: 1, firstName: 'a', lastName: 'b', email: 'c@d.e' },
      createdAt: new Date('2026-01-01'),
      variants: [
         {
            id: 1,
            variant: FileVariantType.original,
            storagePath: 'uploads/uuid/original',
            mimeType: 'image/png',
            size: 3,
            width: 100,
            height: 100,
         },
      ],
   });

   it('happy path: creates PENDING row, enqueues thumbnail job, returns mapped result', async () => {
      prisma.file.create.mockResolvedValue(buildCreatedFile());

      const result = await service.upload(MULTER_FILE, 1);

      const createArgs = prisma.file.create.mock.calls[0][0];
      expect(createArgs.data.processingStatus).toBe(FileProcessingStatus.PENDING);
      expect(queue.process).toHaveBeenCalledWith(7);
      expect(result.publicUrl).toBe('https://cdn/uploads/uuid/original');
      expect(prisma.file.updateMany).not.toHaveBeenCalled();
   });

   it('queue enqueue failure: marks the file FAILED via updateMany, still returns the result', async () => {
      prisma.file.create.mockResolvedValue(buildCreatedFile());
      queue.process.mockRejectedValue(new Error('Redis down'));

      const result = await service.upload(MULTER_FILE, 1);

      expect(prisma.file.updateMany).toHaveBeenCalledWith({
         where: { id: 7 },
         data: {
            processingStatus: FileProcessingStatus.FAILED,
            processingError: 'Redis down',
         },
      });
      expect(result.id).toBe(7);
   });

   it('DB write failure: cleans up orphaned R2 variants and rethrows', async () => {
      const dbErr = new Error('Prisma exploded');
      prisma.file.create.mockRejectedValue(dbErr);

      await expect(service.upload(MULTER_FILE, 1)).rejects.toBe(dbErr);

      expect(storage.deleteFolder).toHaveBeenCalledTimes(1);
      expect(storage.deleteFolder.mock.calls[0][0]).toMatch(/^uploads\//);
   });

   describe('routing by the detected type', () => {
      beforeEach(() => {
         storage.isImage.mockImplementation((type: string) => type.startsWith('image/'));
      });

      it('names a file that is not an image after the folder it gives the storage', async () => {
         prisma.file.create.mockResolvedValue({ ...buildCreatedFile(), variants: [] });
         storage.upload.mockImplementation((_buffer: Buffer, _type: string, basePath: string) =>
            Promise.resolve({ key: `${basePath}/original.pdf`, width: null, height: null }),
         );

         await service.upload({ ...MULTER_FILE, detectedMimeType: 'application/pdf' }, 1);

         const [, , basePath] = storage.upload.mock.calls[0] as [Buffer, string, string];
         const { data } = prisma.file.create.mock.calls[0][0];
         expect(data.filename).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
         );
         expect(basePath).toBe(`uploads/${data.filename}`);
         expect(data.storagePath).toBe(`uploads/${data.filename}/original.pdf`);
      });

      it('gives every file that is not an image its own folder', async () => {
         prisma.file.create.mockResolvedValue({ ...buildCreatedFile(), variants: [] });
         const pdf = { ...MULTER_FILE, detectedMimeType: 'application/pdf' };

         await service.upload(pdf, 1);
         await service.upload(pdf, 1);

         const [first, second] = storage.upload.mock.calls.map(
            (call: unknown[]) => call[2] as string,
         );
         expect(first).not.toBe(second);
      });

      it('stores a file claimed as an image but detected as a PDF as a PDF', async () => {
         prisma.file.create.mockResolvedValue({ ...buildCreatedFile(), variants: [] });

         await service.upload({ ...MULTER_FILE, detectedMimeType: 'application/pdf' }, 1);

         expect(storage.uploadOriginalImage).not.toHaveBeenCalled();
         expect(storage.upload).toHaveBeenCalledWith(
            MULTER_FILE.buffer,
            'application/pdf',
            expect.stringMatching(/^uploads\/[0-9a-f-]{36}$/),
         );
         expect(prisma.file.create.mock.calls[0][0].data.mimeType).toBe('application/pdf');
      });

      it('treats a file claimed as a PDF but detected as a JPEG as an image', async () => {
         prisma.file.create.mockResolvedValue(buildCreatedFile());

         await service.upload(
            { ...MULTER_FILE, mimetype: 'application/pdf', detectedMimeType: 'image/jpeg' },
            1,
         );

         expect(storage.uploadOriginalImage).toHaveBeenCalledTimes(1);
         expect(storage.upload).not.toHaveBeenCalled();
      });

      it('answers 400 when the storage cannot read the image, and stores nothing', async () => {
         storage.uploadOriginalImage.mockRejectedValue(
            new InvalidImageError('The image cannot be read'),
         );

         await expect(service.upload(MULTER_FILE, 1)).rejects.toBeInstanceOf(BadRequestException);
         expect(prisma.file.create).not.toHaveBeenCalled();
      });

      it('rethrows any other storage error as it is', async () => {
         const r2Down = new Error('R2 down');
         storage.uploadOriginalImage.mockRejectedValue(r2Down);

         await expect(service.upload(MULTER_FILE, 1)).rejects.toBe(r2Down);
      });
   });

   describe('the display name of an upload', () => {
      beforeEach(() => {
         storage.isImage.mockImplementation((type: string) => type.startsWith('image/'));
      });

      it.each([
         ['an image', 'image/png'],
         ['a file that is not an image', 'application/pdf'],
      ])('stores the display name of %s trimmed, and a blank one as null', async (_, type) => {
         prisma.file.create.mockResolvedValue(buildCreatedFile());
         const file = { ...MULTER_FILE, detectedMimeType: type };

         await service.upload(file, 1, '  Cat  ');
         await service.upload(file, 1, '  ');

         const names = prisma.file.create.mock.calls.map(
            ([args]: [{ data: { displayName: unknown } }]) => args.data.displayName,
         );
         expect(names).toEqual(['Cat', null]);
      });
   });
});
