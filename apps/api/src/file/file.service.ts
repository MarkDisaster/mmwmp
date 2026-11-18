import {
   BadRequestException,
   ConflictException,
   Injectable,
   Logger,
   NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { CacheService } from '@/cache/cache.service';
import { AUTHOR_SELECT } from '@/common/author/author';
import { incrementVersion } from '@/common/concurrency/record-version';
import type { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { assertEditAllowed } from '@/common/save/publication';
import { IN_TRASH, NOT_TRASHED, toTrashedItem } from '@/common/trash/trash';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Prisma } from '@/generated/prisma/client';
import { FileProcessingStatus, FileVariantType, Language } from '@/generated/prisma/enums';
import { lockProject } from '@/prisma/aggregate-lock.helper';
import { buildOrderBy, buildPaginationArgs, buildSearchWhere } from '@/prisma/pagination.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { type SaveErrorMessages, withSaveErrors } from '@/prisma/save-error.helper';
import { INTERACTIVE_TRANSACTION_OPTIONS, setLockTimeout } from '@/prisma/transaction.helper';
import { AdminEventsService } from '@/realtime/admin-events.service';
import { AdminEventAction } from '@/realtime/enum/admin-event-action.enum';
import { RevalidationService } from '@/revalidation/revalidation.service';
import { InvalidImageError } from '@/storage/invalid-image.error';
import { StorageService } from '@/storage/storage.service';

import type { FileQueryDto } from './dto/file-query.dto';
import { fileDisplayName, normalizeDisplayName } from './file-display-name';
import { toFileWithUrls } from './file-public-urls';
import { FileThumbnailQueue } from './file-thumbnail.queue';
import type { DetectedFile } from './pipes/detected-file-type.pipe';

const FILE_INCLUDE = {
   variants: true,
   createdBy: { select: AUTHOR_SELECT },
} as const;

const FILE_SAVE_ERRORS: SaveErrorMessages = {
   referenceMissing: 'File not found',
};

export type FileMetadataUpdate = {
   displayName?: string | null;
   language?: Language | null;
   altText?: string | null;
};

@Injectable()
export class FileService {
   private readonly logger = new Logger(FileService.name);

   constructor(
      private prisma: PrismaService,
      private storage: StorageService,
      private fileThumbnailQueue: FileThumbnailQueue,
      private cache: CacheService,
      private revalidation: RevalidationService,
      private adminEvents: AdminEventsService,
      private config: ConfigService,
   ) {}

   async invalidatePublicContent(): Promise<void> {
      await this.cache.delPattern('projects:*');
      this.revalidation.revalidate('projects');
   }

   async upload(
      file: DetectedFile,
      createdById: number,
      displayName?: string,
      language?: Language,
   ) {
      const created = this.storage.isImage(file.detectedMimeType)
         ? await this.uploadImage(file, createdById, displayName, language)
         : await this.uploadFile(file, createdById, displayName, language);
      this.adminEvents.publish(EditLockEntity.files, created.id, AdminEventAction.created, 0);
      return created;
   }

   private async uploadImage(
      file: DetectedFile,
      createdById: number,
      displayName?: string,
      language?: Language,
   ) {
      const uuid = randomUUID();
      const basePath = `uploads/${uuid}`;

      const originalVariant = await this.storage
         .uploadOriginalImage(file.buffer, basePath)
         .catch((error: unknown) => {
            if (error instanceof InvalidImageError) throw new BadRequestException(error.message);
            throw error;
         });

      try {
         const created = await this.prisma.file.create({
            data: {
               filename: uuid,
               originalName: file.originalname,
               displayName: normalizeDisplayName(displayName),
               mimeType: originalVariant.mimeType,
               size: originalVariant.size,
               width: originalVariant.width,
               height: originalVariant.height,
               storagePath: basePath,
               language: language ?? null,
               processingStatus: FileProcessingStatus.PENDING,
               createdById,
               variants: {
                  create: [
                     {
                        variant: originalVariant.variant,
                        storagePath: originalVariant.storagePath,
                        mimeType: originalVariant.mimeType,
                        size: originalVariant.size,
                        width: originalVariant.width,
                        height: originalVariant.height,
                     },
                  ],
               },
            },
            include: FILE_INCLUDE,
         });

         try {
            await this.fileThumbnailQueue.process(created.id);
         } catch (queueError) {
            this.logger.error(
               `Failed to enqueue thumbnail job for file ${created.id} — file is uploaded but variants pending`,
               queueError,
            );
            await this.prisma.file
               .updateMany({
                  where: { id: created.id },
                  data: {
                     processingStatus: FileProcessingStatus.FAILED,
                     processingError:
                        queueError instanceof Error ? queueError.message : 'Queue enqueue failed',
                  },
               })
               .catch((updateError) =>
                  this.logger.error('Failed to mark file as FAILED after queue error', updateError),
               );
         }

         return this.mapFileWithPublicUrls(created);
      } catch (error) {
         this.logger.error('DB write failed after S3 upload, cleaning up variants', error);
         await this.storage.deleteFolder(basePath).catch((cleanupError) => {
            this.logger.error('Failed to cleanup orphaned S3 variants', cleanupError);
         });
         throw error;
      }
   }

   private async uploadFile(
      file: DetectedFile,
      createdById: number,
      displayName?: string,
      language?: Language,
   ) {
      const uuid = randomUUID();
      const result = await this.storage.upload(
         file.buffer,
         file.detectedMimeType,
         `uploads/${uuid}`,
      );

      try {
         const created = await this.prisma.file.create({
            data: {
               filename: uuid,
               originalName: file.originalname,
               displayName: normalizeDisplayName(displayName),
               mimeType: file.detectedMimeType,
               size: file.size,
               width: result.width,
               height: result.height,
               storagePath: result.key,
               language: language ?? null,
               createdById,
            },
            include: FILE_INCLUDE,
         });

         return this.mapFileWithPublicUrls(created);
      } catch (error) {
         this.logger.error('DB write failed after S3 upload, cleaning up file', error);
         await this.storage.delete(result.key).catch((cleanupError) => {
            this.logger.error('Failed to cleanup orphaned S3 file', cleanupError);
         });
         throw error;
      }
   }

   async findAll(query: FileQueryDto) {
      const searchWhere = buildSearchWhere(query.search, ['originalName', 'displayName']);
      const where = {
         ...NOT_TRASHED,
         ...searchWhere,
         ...(query.mimeTypePrefix && { mimeType: { startsWith: query.mimeTypePrefix } }),
      };
      const [files, totalCount] = await this.prisma.$transaction([
         this.prisma.file.findMany({
            where,
            include: FILE_INCLUDE,
            ...buildPaginationArgs(query),
            orderBy: buildOrderBy(
               query,
               { createdAt: 'createdAt', originalName: 'originalName', size: 'size' },
               'createdAt',
               'desc',
            ),
         }),
         this.prisma.file.count({ where }),
      ]);
      return { data: files.map((file) => this.mapFileWithPublicUrls(file)), totalCount };
   }

   async findUnused(page: number, limit: number) {
      const where = { projectThumbnails: { none: {} }, projectMedia: { none: {} }, ...NOT_TRASHED };
      const [data, totalCount, total] = await this.prisma.$transaction([
         this.prisma.file.findMany({
            where,
            select: {
               id: true,
               originalName: true,
               displayName: true,
               mimeType: true,
               size: true,
               createdAt: true,
            },
            orderBy: [{ size: 'desc' }, { id: 'asc' }],
            skip: page * limit,
            take: limit,
         }),
         this.prisma.file.count({ where }),
         this.prisma.file.aggregate({ where, _sum: { size: true } }),
      ]);
      return { data, totalCount, totalSizeBytes: total._sum.size ?? 0 };
   }

   async findSummaries(ids: number[]) {
      const files = await this.prisma.file.findMany({
         where: { id: { in: ids }, ...NOT_TRASHED },
         select: { id: true, originalName: true, displayName: true, size: true },
      });
      return new Map(files.map((f) => [f.id, { name: fileDisplayName(f), size: f.size }]));
   }

   async findOne(id: number) {
      const file = await this.prisma.file.findUnique({
         where: { id, ...NOT_TRASHED },
         include: FILE_INCLUDE,
      });

      if (!file) {
         throw new NotFoundException('File not found');
      }

      return this.mapFileWithPublicUrls(file);
   }

   private async assertLive(tx: Prisma.TransactionClient, id: number) {
      const existing = await tx.file.findUnique({
         where: { id, ...NOT_TRASHED },
         select: { id: true },
      });
      if (!existing) throw new NotFoundException('File not found');
   }

   private async assertProjectsEditable(
      tx: Prisma.TransactionClient,
      fileId: number,
      canPublish: boolean,
   ) {
      const projects = await tx.project.findMany({
         where: { ...NOT_TRASHED, OR: [{ thumbnailId: fileId }, { media: { some: { fileId } } }] },
         select: { id: true },
         orderBy: { id: 'asc' },
      });
      for (const project of projects) {
         const { status } = await lockProject(tx, project.id);
         assertEditAllowed(status, canPublish);
      }
   }

   async update(
      id: number,
      fields: FileMetadataUpdate,
      canPublish: boolean,
      expectedVersion?: number,
   ) {
      const { displayName, language, altText } = fields;
      let version = 0;
      const updated = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await this.assertLive(tx, id);
               await this.assertProjectsEditable(tx, id, canPublish);
               version = await incrementVersion(tx, {
                  table: 'files',
                  id,
                  expectedVersion,
                  state: 'live',
               });

               return tx.file.update({
                  where: { id },
                  data: {
                     ...(displayName !== undefined && {
                        displayName: normalizeDisplayName(displayName),
                     }),
                     ...(altText !== undefined && { altText: altText?.trim() || null }),
                     ...(language !== undefined && { language }),
                  },
                  include: FILE_INCLUDE,
               });
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         FILE_SAVE_ERRORS,
      );

      await this.invalidatePublicContent();
      this.adminEvents.publish(EditLockEntity.files, id, AdminEventAction.updated, version);

      return this.mapFileWithPublicUrls(updated);
   }

   async updateMany(
      items: {
         id: number;
         expectedName?: string;
         displayName?: string | null;
         language?: Language | null;
         altText?: string | null;
      }[],
      canPublish: boolean,
   ) {
      const ids = items.map(({ id }) => id);
      const versions = new Map<number, number>();
      const outcome = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const existing = await tx.file.findMany({
                  where: { id: { in: ids }, ...NOT_TRASHED },
                  select: { id: true, originalName: true, displayName: true },
               });
               const byId = new Map(existing.map((file) => [file.id, file]));
               const failed: { id: number; reason: string }[] = [];

               for (const item of items) {
                  const file = byId.get(item.id);
                  if (!file) {
                     failed.push({ id: item.id, reason: 'File not found' });
                  } else if (
                     item.expectedName !== undefined &&
                     item.expectedName !== fileDisplayName(file)
                  ) {
                     failed.push({
                        id: item.id,
                        reason: `The file is now named "${fileDisplayName(file)}", not "${item.expectedName}"`,
                     });
                  }
               }

               const projects = await tx.project.findMany({
                  where: {
                     ...NOT_TRASHED,
                     OR: [
                        { thumbnailId: { in: ids } },
                        { media: { some: { fileId: { in: ids } } } },
                     ],
                  },
                  select: { id: true, thumbnailId: true, media: { select: { fileId: true } } },
                  orderBy: { id: 'asc' },
               });
               const blocked = new Set<number>();
               for (const project of projects) {
                  const { status } = await lockProject(tx, project.id);
                  if (!canPublish && status === 'published') {
                     for (const fileId of [
                        project.thumbnailId,
                        ...project.media.map(({ fileId }) => fileId),
                     ]) {
                        if (fileId !== null && ids.includes(fileId)) blocked.add(fileId);
                     }
                  }
               }
               for (const id of blocked) {
                  failed.push({
                     id,
                     reason:
                        'Used by a published project; changing it needs the publish permission',
                  });
               }

               if (failed.length > 0) return { updated: [], failed };

               for (const id of [...ids].sort((a, b) => a - b)) {
                  versions.set(
                     id,
                     await incrementVersion(tx, { table: 'files', id, state: 'live' }),
                  );
               }
               const updated = [];
               for (const item of items) {
                  const file = await tx.file.update({
                     where: { id: item.id },
                     data: {
                        ...(item.displayName !== undefined && {
                           displayName: normalizeDisplayName(item.displayName),
                        }),
                        ...(item.language !== undefined && { language: item.language }),
                        ...(item.altText !== undefined && {
                           altText: item.altText?.trim() || null,
                        }),
                     },
                     select: {
                        id: true,
                        originalName: true,
                        displayName: true,
                        language: true,
                        altText: true,
                     },
                  });
                  updated.push(file);
               }
               return { updated, failed };
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         FILE_SAVE_ERRORS,
      );

      if (outcome.updated.length > 0) await this.invalidatePublicContent();
      for (const { id } of outcome.updated) {
         this.adminEvents.publish(
            EditLockEntity.files,
            id,
            AdminEventAction.updated,
            versions.get(id) ?? null,
         );
      }
      return outcome;
   }

   async trash(id: number, userId: number | null, canPublish: boolean) {
      let version = 0;
      await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await this.assertLive(tx, id);
               await this.assertProjectsEditable(tx, id, canPublish);
               version = await incrementVersion(tx, { table: 'files', id, state: 'live' });
               await tx.file.update({
                  where: { id },
                  data: { deletedAt: new Date(), deletedById: userId },
               });
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         FILE_SAVE_ERRORS,
      );
      await this.invalidatePublicContent();
      this.adminEvents.publish(EditLockEntity.files, id, AdminEventAction.deleted, version);
   }

   async restore(id: number, canPublish: boolean) {
      const restored = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const existing = await tx.file.findUnique({
                  where: { id, ...IN_TRASH },
                  select: { id: true },
               });
               if (!existing) throw new NotFoundException('File not found in the trash');

               await this.assertProjectsEditable(tx, id, canPublish);
               await incrementVersion(tx, { table: 'files', id, state: 'trashed' });
               return tx.file.update({
                  where: { id },
                  data: { deletedAt: null, deletedById: null },
                  include: FILE_INCLUDE,
               });
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         FILE_SAVE_ERRORS,
      );
      await this.invalidatePublicContent();
      this.adminEvents.publish(
         EditLockEntity.files,
         id,
         AdminEventAction.restored,
         restored.version,
      );
      return this.mapFileWithPublicUrls(restored);
   }

   async findTrashed(query: PaginationQueryDto) {
      const retentionDays = this.config.getOrThrow<number>('app.trashRetentionDays');
      const where = {
         ...IN_TRASH,
         ...buildSearchWhere(query.search, ['originalName', 'displayName']),
      };
      const [rows, totalCount] = await this.prisma.$transaction([
         this.prisma.file.findMany({
            where,
            select: {
               id: true,
               originalName: true,
               displayName: true,
               deletedAt: true,
               deletedBy: { select: AUTHOR_SELECT },
            },
            ...buildPaginationArgs(query),
            orderBy: buildOrderBy(
               query,
               { deletedAt: 'deletedAt', title: 'originalName' },
               'deletedAt',
               'desc',
            ),
         }),
         this.prisma.file.count({ where }),
      ]);
      return {
         data: rows.map(({ originalName, displayName, ...row }) =>
            toTrashedItem(
               { ...row, title: fileDisplayName({ originalName, displayName }) },
               retentionDays,
            ),
         ),
         totalCount,
      };
   }

   async findExpiredTrashIds(cutoff: Date, limit: number, excludeIds: number[] = []) {
      const rows = await this.prisma.file.findMany({
         where: { deletedAt: { lt: cutoff }, id: { notIn: excludeIds } },
         select: { id: true },
         orderBy: [{ deletedAt: 'asc' }, { id: 'asc' }],
         take: limit,
      });
      return rows.map((row) => row.id);
   }

   async removePermanently(id: number) {
      const file = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await setLockTimeout(tx);
               const locked = await tx.$queryRaw<{ id: number }[]>(
                  Prisma.sql`SELECT id FROM files WHERE id = ${id} AND deleted_at IS NOT NULL FOR NO KEY UPDATE`,
               );
               if (locked.length === 0) throw new NotFoundException('File not found in the trash');

               // trash-ok: projects in the trash count too.
               const [thumbnails, media] = await Promise.all([
                  tx.project.count({ where: { thumbnailId: id } }),
                  tx.projectMedia.count({ where: { fileId: id } }),
               ]);
               if (thumbnails > 0 || media > 0) {
                  throw new ConflictException(
                     'File is still used by a project (thumbnail or media), also one in the trash. Remove it there first or restore the file',
                  );
               }

               const stored = await tx.file.findUniqueOrThrow({
                  where: { id },
                  include: { variants: true },
               });
               const { count } = await tx.file.deleteMany({ where: { id, ...IN_TRASH } });
               if (count === 0) throw new NotFoundException('File not found in the trash');
               return stored;
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         FILE_SAVE_ERRORS,
      );

      this.adminEvents.publish(EditLockEntity.files, id, AdminEventAction.deleted, null);

      try {
         if (file.variants.length > 0) {
            await this.storage.deleteFolder(file.storagePath);
         } else {
            await this.storage.delete(file.storagePath);
         }
      } catch (error) {
         this.logger.error(
            `File ${id} removed from the database but storage cleanup of "${file.storagePath}" failed: ${
               error instanceof Error ? error.message : String(error)
            }`,
         );
      }
      return { title: fileDisplayName(file), originalSlug: null };
   }

   private mapFileWithPublicUrls(file: {
      id: number;
      filename: string;
      originalName: string;
      displayName: string | null;
      altText: string | null;
      mimeType: string;
      size: number;
      width: number | null;
      height: number | null;
      storagePath: string;
      language: Language | null;
      deletedAt?: Date | null;
      processingStatus: FileProcessingStatus;
      processingError: string | null;
      createdById: number | null;
      createdBy: { id: number; firstName: string; lastName: string; email: string } | null;
      createdAt: Date;
      variants: {
         id: number;
         variant: FileVariantType;
         storagePath: string;
         mimeType: string;
         size: number;
         width: number | null;
         height: number | null;
      }[];
   }) {
      return toFileWithUrls(file, this.storage);
   }
}
