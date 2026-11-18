import type { Job } from 'bullmq';

import { FileProcessingStatus, FileVariantType } from '@/generated/prisma/enums';
import type { PrismaService } from '@/prisma/prisma.service';
import type { StorageService } from '@/storage/storage.service';

import type { FileService } from '../file.service';
import { FILE_THUMBNAIL_JOB_PROCESS } from '../file-thumbnail.constants';
import { FileThumbnailProcessor } from '../file-thumbnail.processor';
import type { ProcessThumbnailJobData } from '../file-thumbnail.types';

describe('FileThumbnailProcessor', () => {
   const FILE_ID = 42;

   type PrismaMock = {
      file: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
      fileVariant: { deleteMany: jest.Mock; createMany: jest.Mock };
      $transaction: jest.Mock;
   };
   type StorageMock = { getBuffer: jest.Mock; generateResizedVariants: jest.Mock };

   let prisma: PrismaMock;
   let storage: StorageMock;
   let fileService: { invalidatePublicContent: jest.Mock };
   let processor: FileThumbnailProcessor;

   const buildJob = (
      overrides: Partial<Job<ProcessThumbnailJobData>> = {},
   ): Job<ProcessThumbnailJobData> =>
      ({
         id: 'j-1',
         name: FILE_THUMBNAIL_JOB_PROCESS,
         data: { fileId: FILE_ID },
         attemptsMade: 0,
         opts: { attempts: 3 },
         ...overrides,
      }) as Job<ProcessThumbnailJobData>;

   const buildFile = (
      variants: Array<{ variant: FileVariantType }>,
      status: FileProcessingStatus = FileProcessingStatus.PENDING,
   ) => ({
      id: FILE_ID,
      storagePath: 'uploads/abc',
      processingStatus: status,
      variants: variants.map((v) => ({
         variant: v.variant,
         storagePath: `uploads/abc/${v.variant}`,
      })),
   });

   beforeEach(() => {
      prisma = {
         file: {
            findUnique: jest.fn(),
            update: jest.fn().mockResolvedValue(undefined),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
         },
         fileVariant: { deleteMany: jest.fn(), createMany: jest.fn() },
         $transaction: jest.fn().mockResolvedValue([]),
      };
      storage = { getBuffer: jest.fn(), generateResizedVariants: jest.fn() };
      fileService = { invalidatePublicContent: jest.fn().mockResolvedValue(undefined) };
      processor = new FileThumbnailProcessor(
         prisma as unknown as PrismaService,
         storage as unknown as StorageService,
         fileService as unknown as FileService,
      );
   });

   it('skips unknown job names', async () => {
      await processor.process(buildJob({ name: 'bogus' }));
      expect(prisma.file.findUnique).not.toHaveBeenCalled();
      expect(fileService.invalidatePublicContent).not.toHaveBeenCalled();
   });

   it('skips when the file row is missing (deleted between enqueue and run)', async () => {
      prisma.file.findUnique.mockResolvedValue(null);
      await processor.process(buildJob());
      expect(prisma.file.update).not.toHaveBeenCalled();
      expect(storage.getBuffer).not.toHaveBeenCalled();
   });

   it('is idempotent — skips when file is READY with all resized variants present', async () => {
      prisma.file.findUnique.mockResolvedValue(
         buildFile(
            [
               { variant: FileVariantType.original },
               { variant: FileVariantType.thumbnail },
               { variant: FileVariantType.medium },
               { variant: FileVariantType.large },
            ],
            FileProcessingStatus.READY,
         ),
      );
      await processor.process(buildJob());
      expect(prisma.file.update).not.toHaveBeenCalled();
      expect(storage.getBuffer).not.toHaveBeenCalled();
      expect(fileService.invalidatePublicContent).toHaveBeenCalledTimes(1);
   });

   it('does not invalidate when generating the variants fails', async () => {
      prisma.file.findUnique.mockResolvedValue(buildFile([{ variant: FileVariantType.original }]));
      storage.getBuffer.mockRejectedValue(new Error('r2 down'));

      await expect(processor.process(buildJob())).rejects.toThrow('r2 down');

      expect(fileService.invalidatePublicContent).not.toHaveBeenCalled();
   });

   it('invalidates only after the READY transaction has committed', async () => {
      const order: string[] = [];
      prisma.file.findUnique.mockResolvedValue(buildFile([{ variant: FileVariantType.original }]));
      storage.getBuffer.mockResolvedValue(Buffer.from('img'));
      storage.generateResizedVariants.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(async () => {
         order.push('commit');
         return [];
      });
      fileService.invalidatePublicContent.mockImplementation(async () => {
         order.push('invalidate');
      });

      await processor.process(buildJob());

      expect(order).toEqual(['commit', 'invalidate']);
   });

   it('throws if the original variant is missing AND flows through FAILED-state handling on final attempt', async () => {
      prisma.file.findUnique.mockResolvedValue(buildFile([{ variant: FileVariantType.thumbnail }]));
      const job = buildJob({ attemptsMade: 2, opts: { attempts: 3 } });
      await expect(processor.process(job)).rejects.toThrow(/no original variant/);

      expect(prisma.file.update).toHaveBeenCalledWith({
         where: { id: FILE_ID },
         data: { processingStatus: FileProcessingStatus.PROCESSING, processingError: null },
      });
      expect(prisma.file.updateMany).toHaveBeenCalledWith({
         where: { id: FILE_ID },
         data: {
            processingStatus: FileProcessingStatus.FAILED,
            processingError: expect.stringMatching(/no original variant/),
         },
      });
   });

   it('happy path: marks PROCESSING, generates variants, commits READY transaction', async () => {
      prisma.file.findUnique.mockResolvedValue(buildFile([{ variant: FileVariantType.original }]));
      storage.getBuffer.mockResolvedValue(Buffer.from('img'));
      storage.generateResizedVariants.mockResolvedValue([
         {
            variant: FileVariantType.thumbnail,
            storagePath: 'uploads/abc/thumbnail',
            mimeType: 'image/webp',
            size: 1,
            width: 250,
            height: 250,
         },
      ]);

      await processor.process(buildJob());

      expect(prisma.file.update).toHaveBeenCalledWith({
         where: { id: FILE_ID },
         data: { processingStatus: FileProcessingStatus.PROCESSING, processingError: null },
      });
      expect(fileService.invalidatePublicContent).toHaveBeenCalledTimes(1);
      expect(storage.generateResizedVariants).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      const txArg = (prisma.$transaction as jest.Mock).mock.calls[0][0] as unknown[];
      const fileUpdates = (prisma.file.update as jest.Mock).mock.calls.map((c) => c[0]);
      const readyUpdate = fileUpdates.find(
         (u) => u.data?.processingStatus === FileProcessingStatus.READY,
      );
      expect(readyUpdate).toBeDefined();
      expect(readyUpdate.where).toEqual({ id: FILE_ID });
      expect(txArg.length).toBeGreaterThanOrEqual(3);
   });

   it('on a NON-final failure: records the error and re-throws (status untouched)', async () => {
      prisma.file.findUnique.mockResolvedValue(buildFile([{ variant: FileVariantType.original }]));
      storage.getBuffer.mockRejectedValue(new Error('R2 timeout'));

      const job = buildJob({ attemptsMade: 0, opts: { attempts: 3 } });
      await expect(processor.process(job)).rejects.toThrow('R2 timeout');

      const calls = prisma.file.updateMany.mock.calls;
      expect(calls).toHaveLength(1);
      expect(calls[0][0].data.processingError).toBe('R2 timeout');
      expect(calls[0][0].data.processingStatus).toBeUndefined();
   });

   it('on the FINAL failed attempt: marks FAILED via updateMany (concurrent-delete safe)', async () => {
      prisma.file.findUnique.mockResolvedValue(buildFile([{ variant: FileVariantType.original }]));
      storage.getBuffer.mockRejectedValue(new Error('sharp crashed'));

      const job = buildJob({ attemptsMade: 2, opts: { attempts: 3 } });
      await expect(processor.process(job)).rejects.toThrow('sharp crashed');

      expect(prisma.file.updateMany).toHaveBeenCalledWith({
         where: { id: FILE_ID },
         data: {
            processingStatus: FileProcessingStatus.FAILED,
            processingError: 'sharp crashed',
         },
      });
      expect(prisma.file.update).toHaveBeenCalledTimes(1);
   });
});
