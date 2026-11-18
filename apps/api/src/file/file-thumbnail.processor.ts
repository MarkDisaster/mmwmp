import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { ReportingWorkerHost } from '@/common/sentry/reporting-worker-host';
import { FileProcessingStatus, FileVariantType } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';
import { IDLE_WORKER_OPTIONS } from '@/queue/queue.constants';
import { RESIZED_VARIANT_NAMES, StorageService } from '@/storage/storage.service';

import { FileService } from './file.service';
import { FILE_THUMBNAIL_JOB_PROCESS, FILE_THUMBNAIL_QUEUE } from './file-thumbnail.constants';
import type { ProcessThumbnailJobData } from './file-thumbnail.types';

@Processor(FILE_THUMBNAIL_QUEUE, IDLE_WORKER_OPTIONS)
export class FileThumbnailProcessor extends ReportingWorkerHost {
   private readonly logger = new Logger(FileThumbnailProcessor.name);

   constructor(
      private readonly prisma: PrismaService,
      private readonly storage: StorageService,
      private readonly fileService: FileService,
   ) {
      super();
   }

   async process(job: Job<ProcessThumbnailJobData>): Promise<void> {
      if (job.name !== FILE_THUMBNAIL_JOB_PROCESS) {
         this.logger.warn(`Unknown thumbnail job "${job.name}" (id=${job.id}) — skipping`);
         return;
      }

      const { fileId } = job.data;
      // trash-ok: a file moved to the trash while its variants are made still gets them.
      const file = await this.prisma.file.findUnique({
         where: { id: fileId },
         include: { variants: true },
      });

      if (!file) {
         this.logger.warn(`File ${fileId} not found — skipping thumbnail job`);
         return;
      }

      const hasAllResized = RESIZED_VARIANT_NAMES.every((name) =>
         file.variants.some((v) => v.variant === name),
      );
      if (file.processingStatus === FileProcessingStatus.READY && hasAllResized) {
         this.logger.log(`File ${fileId} already READY with variants — skipping`);
         await this.fileService.invalidatePublicContent();
         return;
      }

      await this.prisma.file.update({
         where: { id: fileId },
         data: { processingStatus: FileProcessingStatus.PROCESSING, processingError: null },
      });

      try {
         const originalVariant = file.variants.find((v) => v.variant === FileVariantType.original);
         if (!originalVariant) {
            throw new Error(`File ${fileId} has no original variant — cannot generate thumbnails`);
         }

         this.logger.log(`Processing thumbnails for file ${fileId}`);
         const buffer = await this.storage.getBuffer(originalVariant.storagePath);
         const variants = await this.storage.generateResizedVariants(buffer, file.storagePath);

         await this.prisma.$transaction([
            this.prisma.fileVariant.deleteMany({
               where: { fileId, variant: { in: [...RESIZED_VARIANT_NAMES] } },
            }),
            this.prisma.fileVariant.createMany({
               data: variants.map((v) => ({
                  fileId,
                  variant: v.variant,
                  storagePath: v.storagePath,
                  mimeType: v.mimeType,
                  size: v.size,
                  width: v.width,
                  height: v.height,
               })),
            }),
            this.prisma.file.update({
               where: { id: fileId },
               data: { processingStatus: FileProcessingStatus.READY, processingError: null },
            }),
         ]);

         this.logger.log(`File ${fileId} thumbnails READY`);
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

         if (isFinalAttempt) {
            this.logger.error(`File ${fileId} thumbnails FAILED permanently: ${message}`);
            await this.prisma.file.updateMany({
               where: { id: fileId },
               data: {
                  processingStatus: FileProcessingStatus.FAILED,
                  processingError: message,
               },
            });
         } else {
            this.logger.warn(
               `File ${fileId} thumbnails failed (attempt ${job.attemptsMade + 1}): ${message}`,
            );
            await this.prisma.file.updateMany({
               where: { id: fileId },
               data: { processingError: message },
            });
         }
         throw error;
      }

      await this.fileService.invalidatePublicContent();
   }
}
