import {
   BadRequestException,
   ConflictException,
   Injectable,
   NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { PromptRegistryService } from '@/ai/prompts/prompt-registry.service';
import {
   assertTranslationSourceSize,
   assertTranslationWithinLimit,
   translateFields,
} from '@/ai/translation';
import { CacheService } from '@/cache/cache.service';
import { AUTHOR_SELECT } from '@/common/author/author';
import { incrementVersion, type VersionedRecord } from '@/common/concurrency/record-version';
import type { MoveItemDto } from '@/common/dto/move-item.dto';
import type { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import type { SlugRedirectEntity } from '@/common/dto/slug-redirect.dto';
import type { StatusFilterQueryDto } from '@/common/dto/status-filter-query.dto';
import type { UpdateStatusDto } from '@/common/dto/update-status.dto';
import { ApiErrorCode } from '@/common/enum/api-error-code.enum';
import { sanitizePlainText } from '@/common/sanitize/sanitize-plain-text';
import { sanitizeRichText } from '@/common/sanitize/sanitize-rich-text';
import {
   assertEditAllowed,
   assertSaveAllowed,
   assertStatusChangeAllowed,
   publicationChange,
} from '@/common/save/publication';
import type { SaveActor } from '@/common/save/save-actor';
import {
   deleteSlugRedirects,
   findRedirectSlug,
   syncSlugRedirects,
} from '@/common/slug-redirect/slug-redirect';
import { assertSameIds } from '@/common/sort/assert-same-ids';
import {
   createAtEnd,
   lockOrder,
   moveInTable,
   nextSortOrder,
   writeSortOrders,
} from '@/common/sort/ordered-table';
import { IN_TRASH, NOT_TRASHED, toTrashedItem, trashedSlug } from '@/common/trash/trash';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { FileService } from '@/file/file.service';
import { type StoredFile, toFileWithUrls } from '@/file/file-public-urls';
import { Prisma } from '@/generated/prisma/client';
import { EntityStatus, Language, SlugRedirectResource } from '@/generated/prisma/enums';
import { lockProject } from '@/prisma/aggregate-lock.helper';
import { buildOrderBy, buildPaginationArgs, buildSearchWhere } from '@/prisma/pagination.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { saveConflict, type SaveErrorMessages, withSaveErrors } from '@/prisma/save-error.helper';
import { INTERACTIVE_TRANSACTION_OPTIONS } from '@/prisma/transaction.helper';
import { RateLimitService } from '@/rate-limit/rate-limit.service';
import { AdminEventsService } from '@/realtime/admin-events.service';
import { AdminEventAction } from '@/realtime/enum/admin-event-action.enum';
import { RevalidationService } from '@/revalidation/revalidation.service';
import { StorageService } from '@/storage/storage.service';
import { TAG_TRANSLATIONS_SELECT, tagName } from '@/tag/tag-translations';

import { AddProjectMediaDto } from './dto/add-project-media.dto';
import { AssignProjectLinksDto } from './dto/assign-project-links.dto';
import { AssignTagsDto } from './dto/assign-tags.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import type { GenerateProjectTranslationResponseDto } from './dto/generate-translation-response.dto';
import type { SaveProjectDto, SaveProjectTranslationDto } from './dto/save-project.dto';
import { SortProjectMediaDto } from './dto/sort-project-media.dto';
import { SortProjectTagsDto } from './dto/sort-project-tags.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpsertTranslationDto } from './dto/upsert-translation.dto';
import { assertYearRange, pickTranslations, planMedia } from './project-save';

const CACHE_TTL_LIST = 60;
const CACHE_TTL_DETAIL = 300;
const CACHE_TTL_REDIRECT = 300;
const CACHE_KEY_PREFIX = 'projects:v7';

const PROJECT_DETAIL_INCLUDE = {
   translations: true,
   tags: {
      where: { tag: NOT_TRASHED },
      include: { tag: { include: { translations: TAG_TRANSLATIONS_SELECT } } },
      orderBy: { sortOrder: Prisma.SortOrder.asc },
   },
   links: { orderBy: { sortOrder: Prisma.SortOrder.asc } },
   thumbnail: { include: { variants: true } },
   media: {
      include: { file: { include: { variants: true } } },
      orderBy: { sortOrder: Prisma.SortOrder.asc },
   },
   createdBy: { select: AUTHOR_SELECT },
} satisfies Prisma.ProjectInclude;

const PUBLIC_FILE_SELECT = {
   id: true,
   displayName: true,
   altText: true,
   mimeType: true,
   width: true,
   height: true,
   language: true,
   deletedAt: true,
   variants: {
      select: {
         id: true,
         variant: true,
         mimeType: true,
         width: true,
         height: true,
         storagePath: true,
      },
   },
} satisfies Prisma.FileSelect;

const PUBLIC_TAG_SELECT = {
   id: true,
   translations: TAG_TRANSLATIONS_SELECT,
   slug: true,
   color: true,
   sortOrder: true,
   createdAt: true,
   updatedAt: true,
} satisfies Prisma.TagSelect;

const publicProjectInclude = (language?: Language) =>
   ({
      translations: language ? { where: { language } } : true,
      tags: {
         where: { tag: NOT_TRASHED },
         include: { tag: { select: PUBLIC_TAG_SELECT } },
         orderBy: { sortOrder: Prisma.SortOrder.asc },
      },
      links: { orderBy: { sortOrder: Prisma.SortOrder.asc } },
      thumbnail: { select: PUBLIC_FILE_SELECT },
      media: {
         where: { file: NOT_TRASHED },
         include: { file: { select: PUBLIC_FILE_SELECT } },
         orderBy: { sortOrder: Prisma.SortOrder.asc },
      },
   }) satisfies Prisma.ProjectInclude;

const SLUG_CONFLICT_MESSAGE = 'Project with this slug already exists';

const TRANSLATION_SCHEMA = z.object({
   title: z.string(),
   description: z.string().nullable(),
   content: z.string().nullable(),
   metaTitle: z.string().nullable(),
   metaDescription: z.string().nullable(),
});

const LAST_TRANSLATION_MESSAGE = 'The last translation with a title cannot be deleted';

const PROJECT_SAVE_ERRORS: SaveErrorMessages = {
   uniqueTaken: { field: 'slug', message: SLUG_CONFLICT_MESSAGE, code: ApiErrorCode.SLUG_TAKEN },
   referenceMissing: 'Thumbnail, file or tag not found',
};

const toTranslationData = (translation: SaveProjectTranslationDto) => ({
   title: translation.title.trim(),
   role: translation.role?.trim() || null,
   description: sanitizePlainText(translation.description),
   content: sanitizeRichText(translation.content),
   metaTitle: translation.metaTitle || null,
   metaDescription: translation.metaDescription || null,
});

const toProjectFields = (dto: SaveProjectDto) => ({
   slug: dto.slug,
   thumbnailId: dto.thumbnailId,
   showOnHomepage: dto.showOnHomepage,
   company: dto.company?.trim() || null,
   startYear: dto.startYear,
   endYear: dto.endYear,
   ...(dto.ongoing !== undefined && { ongoing: dto.ongoing }),
});

const toTagRows = (tagIds: number[]) =>
   [...new Set(tagIds)].map((tagId, sortOrder) => ({ tagId, sortOrder }));

const toLinkRows = (links: SaveProjectDto['links']) =>
   links.map((link, sortOrder) => ({
      label: link.label?.trim() || null,
      url: link.url,
      sortOrder,
   }));

@Injectable()
export class ProjectService {
   constructor(
      private prisma: PrismaService,
      private fileService: FileService,
      private storage: StorageService,
      private cache: CacheService,
      private prompts: PromptRegistryService,
      private revalidation: RevalidationService,
      private adminEvents: AdminEventsService,
      private config: ConfigService,
      private rateLimit: RateLimitService,
   ) {}

   private projectListKey(
      query: PaginationQueryDto,
      language?: Language,
      homepageOnly?: boolean,
   ): string {
      const { page = 0, limit = 100, sortBy, sortOrder } = query;
      return `${CACHE_KEY_PREFIX}:list:${language ?? 'all'}:${page}:${limit}:${sortBy ?? 'default'}:${sortOrder ?? 'asc'}:${homepageOnly ? '1' : '0'}`;
   }

   private projectSlugKey(slug: string, language?: Language): string {
      return `${CACHE_KEY_PREFIX}:slug:${slug}:${language ?? 'all'}`;
   }

   private async invalidateProjectCache(): Promise<void> {
      await Promise.all([this.cache.delPattern('projects:*'), this.cache.delPattern('services:*')]);
      this.revalidation.revalidate('projects');
      this.revalidation.revalidate('services');
      this.revalidation.revalidate('tags');
   }

   private mapProjectFiles<
      P extends { thumbnail: StoredFile | null; media: { file: StoredFile }[] },
   >(project: P) {
      return {
         ...project,
         thumbnail: project.thumbnail ? toFileWithUrls(project.thumbnail, this.storage) : null,
         media: project.media.map((m) => ({ ...m, file: toFileWithUrls(m.file, this.storage) })),
      };
   }

   private toPublicFile(file: Prisma.FileGetPayload<{ select: typeof PUBLIC_FILE_SELECT }>) {
      const { deletedAt: _deletedAt, ...rest } = file;
      return {
         ...rest,
         variants: file.variants.map(({ storagePath, ...variant }) => ({
            ...variant,
            publicUrl: this.storage.getPublicUrl(storagePath),
         })),
      };
   }

   private toPublicProject(
      project: Prisma.ProjectGetPayload<{ include: ReturnType<typeof publicProjectInclude> }>,
   ) {
      const { createdById: _createdById, version: _version, thumbnail, media, ...rest } = project;
      return {
         ...rest,
         thumbnail: thumbnail && !thumbnail.deletedAt ? this.toPublicFile(thumbnail) : null,
         media: media.map((item) => ({ ...item, file: this.toPublicFile(item.file) })),
      };
   }

   async create(createdById: number, dto: CreateProjectDto) {
      const title = dto.title.trim();
      const result = await createAtEnd(this.prisma, 'projects', async (tx, sortOrder) => {
         const project = await tx.project.create({
            data: {
               title,
               slug: dto.slug,
               createdById,
               sortOrder,
               translations: {
                  create: {
                     language: dto.language,
                     title,
                     role: dto.role?.trim() || null,
                     description: sanitizePlainText(dto.description),
                     content: sanitizeRichText(dto.content),
                     metaTitle: dto.metaTitle,
                     metaDescription: dto.metaDescription,
                  },
               },
            },
            include: { translations: true },
         });
         await this.syncRedirects(tx, project.id, null, project.slug, false);
         return project;
      });
      await this.invalidateProjectCache();
      this.adminEvents.publish(EditLockEntity.projects, result.id, AdminEventAction.created, 0);
      return result;
   }

   async findAll(query: StatusFilterQueryDto) {
      const where = {
         ...NOT_TRASHED,
         ...buildSearchWhere(query.search, ['title', 'slug']),
         ...(query.status && { status: query.status }),
      };
      const include = {
         translations: true,
         tags: {
            where: { tag: NOT_TRASHED },
            include: { tag: { include: { translations: TAG_TRANSLATIONS_SELECT } } },
            orderBy: { sortOrder: Prisma.SortOrder.asc },
         },
         links: { orderBy: { sortOrder: Prisma.SortOrder.asc } },
         thumbnail: { include: { variants: true } },
         createdBy: { select: AUTHOR_SELECT },
      };

      const [projects, totalCount] = await this.prisma.$transaction([
         this.prisma.project.findMany({
            where,
            include,
            ...buildPaginationArgs(query),
            orderBy: buildOrderBy(
               query,
               {
                  sortOrder: 'sortOrder',
                  createdAt: 'createdAt',
                  updatedAt: 'updatedAt',
                  status: 'status',
                  title: 'title',
                  createdBy: (order) => [
                     { createdBy: { lastName: order } },
                     { createdBy: { firstName: order } },
                  ],
               },
               'sortOrder',
            ),
         }),
         this.prisma.project.count({ where }),
      ]);

      return {
         data: projects.map((p) => this.mapProjectFiles({ ...p, media: [] })),
         totalCount,
      };
   }

   async findOne(id: number) {
      const project = await this.prisma.project.findUnique({
         where: { id, ...NOT_TRASHED },
         include: PROJECT_DETAIL_INCLUDE,
      });

      if (!project) {
         throw new NotFoundException('Project not found');
      }

      return this.mapProjectFiles(project);
   }

   findLookupCandidates(take: number) {
      return this.prisma.project.findMany({
         where: NOT_TRASHED,
         select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            company: true,
            translations: { select: { language: true, title: true } },
         },
         orderBy: [{ updatedAt: Prisma.SortOrder.desc }, { id: Prisma.SortOrder.desc }],
         take,
      });
   }

   private async findDetail(tx: Prisma.TransactionClient, id: number) {
      const project = await tx.project.findUniqueOrThrow({
         where: { id, ...NOT_TRASHED },
         include: PROJECT_DETAIL_INCLUDE,
      });
      return this.mapProjectFiles(project);
   }

   private async writeProject<T>(
      { id, expectedVersion }: VersionedRecord,
      write: (
         tx: Prisma.TransactionClient,
         current: { status: EntityStatus; slug: string },
      ) => Promise<T>,
      action: AdminEventAction = AdminEventAction.updated,
   ): Promise<T> {
      let version = 0;
      const result = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const current = await lockProject(tx, id);
               version = await incrementVersion(tx, { table: 'projects', id, expectedVersion });
               return write(tx, current);
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         PROJECT_SAVE_ERRORS,
      );
      this.adminEvents.publish(EditLockEntity.projects, id, action, version);
      return result;
   }

   private editProject<T>(
      record: VersionedRecord,
      actor: SaveActor,
      write: (
         tx: Prisma.TransactionClient,
         current: { status: EntityStatus; slug: string },
      ) => Promise<T>,
   ): Promise<T> {
      return this.writeProject(record, (tx, current) => {
         assertEditAllowed(current.status, actor.canPublish);
         return write(tx, current);
      });
   }

   async update(id: number, dto: UpdateProjectDto, actor: SaveActor) {
      if (dto.thumbnailId !== undefined && dto.thumbnailId !== null) {
         await this.fileService.findOne(dto.thumbnailId);
      }

      const record = { id, expectedVersion: dto.version };
      const result = await this.editProject(record, actor, async (tx, current) => {
         const existing = await tx.project.findUniqueOrThrow({
            where: { id, ...NOT_TRASHED },
            select: { startYear: true, endYear: true, ongoing: true },
         });
         const startYear = dto.startYear !== undefined ? dto.startYear : existing.startYear;
         const endYear = dto.endYear !== undefined ? dto.endYear : existing.endYear;
         const ongoing = dto.ongoing !== undefined ? dto.ongoing : existing.ongoing;
         assertYearRange(startYear, endYear, ongoing);

         const updated = await tx.project.update({
            where: { id },
            data: {
               ...(dto.company !== undefined && { company: dto.company?.trim() || null }),
               ...(dto.startYear !== undefined && { startYear: dto.startYear }),
               ...(dto.endYear !== undefined && { endYear: dto.endYear }),
               ...(dto.ongoing !== undefined && { ongoing: dto.ongoing }),
               ...(dto.slug !== undefined && { slug: dto.slug }),
               ...(dto.thumbnailId !== undefined && { thumbnailId: dto.thumbnailId }),
               ...(dto.showOnHomepage !== undefined && { showOnHomepage: dto.showOnHomepage }),
            },
            include: { translations: true },
         });
         if (dto.slug !== undefined) {
            await this.syncRedirects(
               tx,
               id,
               current.slug,
               updated.slug,
               current.status === EntityStatus.published,
            );
         }
         return updated;
      });

      await this.invalidateProjectCache();
      return result;
   }

   private syncRedirects(
      tx: Prisma.TransactionClient,
      id: number,
      oldSlug: string | null,
      newSlug: string,
      wasPublished: boolean,
   ) {
      return syncSlugRedirects(tx, SlugRedirectResource.project, {
         id,
         oldSlug,
         newSlug,
         wasPublished,
      });
   }

   async saveNew(dto: SaveProjectDto, actor: SaveActor) {
      assertStatusChangeAllowed(null, dto.status, actor.canPublish);
      const translations = pickTranslations(dto.translations);
      assertYearRange(dto.startYear, dto.endYear, dto.ongoing ?? false);
      const media = planMedia(dto.media, []);
      await this.assertSaveReferences(dto, null);

      const project = await withSaveErrors(
         () =>
            createAtEnd(this.prisma, 'projects', async (tx, sortOrder) => {
               const { id } = await tx.project.create({
                  data: {
                     ...toProjectFields(dto),
                     ...publicationChange(dto.status, null),
                     createdById: actor.userId,
                     sortOrder,
                     translations: {
                        create: translations.map((translation) => ({
                           language: translation.language,
                           ...toTranslationData(translation),
                        })),
                     },
                     tags: { createMany: { data: toTagRows(dto.tagIds) } },
                     links: { createMany: { data: toLinkRows(dto.links) } },
                     media: { createMany: { data: media.create } },
                  },
                  select: { id: true },
               });
               await this.syncTitle(id, tx);
               await this.syncRedirects(tx, id, null, dto.slug, false);
               return this.findDetail(tx, id);
            }),
         PROJECT_SAVE_ERRORS,
      );

      await this.invalidateProjectCache();
      this.adminEvents.publish(EditLockEntity.projects, project.id, AdminEventAction.created, 0);
      return project;
   }

   async saveExisting(id: number, dto: SaveProjectDto, actor: SaveActor) {
      const translations = pickTranslations(dto.translations);
      assertYearRange(dto.startYear, dto.endYear, dto.ongoing ?? false);
      const exists = await this.prisma.project.findUnique({
         where: { id, ...NOT_TRASHED },
         select: { id: true },
      });
      if (!exists) throw new NotFoundException('Project not found');
      await this.assertSaveReferences(dto, id);

      const record = { id, expectedVersion: dto.version };
      const project = await this.writeProject(record, async (tx, current) => {
         assertSaveAllowed(current.status, dto.status, actor.canPublish);
         if (dto.ongoing === undefined) {
            const { ongoing } = await tx.project.findUniqueOrThrow({
               where: { id },
               select: { ongoing: true },
            });
            assertYearRange(dto.startYear, dto.endYear, ongoing);
         }

         const existingMedia = await tx.projectMedia.findMany({
            where: { projectId: id },
            select: { id: true, sortOrder: true },
         });
         const media = planMedia(
            dto.media,
            existingMedia.map((row) => row.id),
         );

         await tx.project.update({
            where: { id },
            data: { ...toProjectFields(dto), ...publicationChange(dto.status, current.status) },
         });
         await this.syncRedirects(
            tx,
            id,
            current.slug,
            dto.slug,
            current.status === EntityStatus.published,
         );

         for (const translation of translations) {
            const data = toTranslationData(translation);
            await tx.projectTranslation.upsert({
               where: { projectId_language: { projectId: id, language: translation.language } },
               create: { projectId: id, language: translation.language, ...data },
               update: data,
            });
         }
         await this.syncTitle(id, tx);

         await tx.projectTag.deleteMany({ where: { projectId: id, tag: NOT_TRASHED } });
         await tx.projectTag.createMany({
            data: toTagRows(dto.tagIds).map((row) => ({ projectId: id, ...row })),
         });

         await tx.projectLink.deleteMany({ where: { projectId: id } });
         await tx.projectLink.createMany({
            data: toLinkRows(dto.links).map((row) => ({ projectId: id, ...row })),
         });

         if (media.removeIds.length > 0) {
            await tx.projectMedia.deleteMany({
               where: { projectId: id, id: { in: media.removeIds } },
            });
         }
         const storedOrder = new Map(existingMedia.map((row) => [row.id, row.sortOrder]));
         await writeSortOrders(
            tx,
            'project_media',
            media.keep.filter((row) => storedOrder.get(row.id) !== row.sortOrder),
         );
         await tx.projectMedia.createMany({
            data: media.create.map((row) => ({ projectId: id, ...row })),
         });

         return this.findDetail(tx, id);
      });

      await this.invalidateProjectCache();
      return project;
   }

   private async assertSaveReferences(dto: SaveProjectDto, projectId: number | null) {
      if (dto.thumbnailId !== null) {
         await this.fileService.findOne(dto.thumbnailId);
      }

      const fileIds = [
         ...new Set(
            dto.media.flatMap((item) =>
               item.id === undefined && item.fileId !== undefined ? [item.fileId] : [],
            ),
         ),
      ];
      if (fileIds.length > 0) {
         const files = await this.prisma.file.findMany({
            where: { id: { in: fileIds }, ...NOT_TRASHED },
            select: { id: true },
         });
         const found = new Set(files.map((file) => file.id));
         const missing = fileIds.find((fileId) => !found.has(fileId));
         if (missing !== undefined) throw new NotFoundException(`File ${missing} not found`);
      }

      const tagIds = [...new Set(dto.tagIds)];
      if (tagIds.length > 0) {
         const tagsCount = await this.prisma.tag.count({
            where: { id: { in: tagIds }, ...NOT_TRASHED },
         });
         if (tagsCount !== tagIds.length) {
            throw new NotFoundException('One or more tags could not be found');
         }
      }

      const owner = await this.prisma.project.findUnique({
         where: { slug: dto.slug, ...NOT_TRASHED },
         select: { id: true },
      });
      if (owner && owner.id !== projectId) {
         throw saveConflict(SLUG_CONFLICT_MESSAGE, ApiErrorCode.SLUG_TAKEN);
      }
   }

   async move(id: number, dto: MoveItemDto, actor: SaveActor) {
      const { moved, version } = await moveInTable(this.prisma, {
         table: 'projects',
         id,
         targetId: dto.targetId,
         position: dto.position,
         expectedVersion: dto.version,
         canPublish: actor.canPublish,
      });
      if (moved > 0) await this.invalidateProjectCache();
      this.adminEvents.publish(EditLockEntity.projects, id, AdminEventAction.moved, version);
   }

   async updateStatus(id: number, dto: UpdateStatusDto) {
      const record = { id, expectedVersion: dto.version };
      const result = await this.writeProject(record, (tx, current) =>
         tx.project.update({
            where: { id },
            data: publicationChange(dto.status, current.status),
            include: { translations: true },
         }),
      );

      await this.invalidateProjectCache();
      return result;
   }

   async trash(id: number, userId: number | null) {
      await this.writeProject(
         { id },
         async (tx, current) => {
            const { slug } = await tx.project.findUniqueOrThrow({
               where: { id, ...NOT_TRASHED },
               select: { slug: true },
            });
            await tx.project.update({
               where: { id },
               data: {
                  deletedAt: new Date(),
                  deletedById: userId,
                  originalSlug: slug,
                  slug: trashedSlug(slug, id),
                  ...publicationChange(EntityStatus.draft, current.status),
               },
            });
         },
         AdminEventAction.deleted,
      );

      await this.invalidateProjectCache();
   }

   async restore(id: number) {
      const restored = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await lockOrder(tx, 'projects');
               const locked = await lockProject(tx, id, 'trashed');
               await incrementVersion(tx, { table: 'projects', id });
               const { originalSlug } = await tx.project.findUniqueOrThrow({
                  where: { id, ...IN_TRASH },
                  select: { originalSlug: true },
               });
               if (!originalSlug) throw new NotFoundException('Project not found in the trash');
               const owner = await tx.project.findUnique({
                  where: { slug: originalSlug },
                  select: { id: true },
               });
               if (owner) {
                  throw new ConflictException(
                     `Cannot restore: another project already uses the slug "${originalSlug}"`,
                  );
               }
               await tx.project.update({
                  where: { id },
                  data: {
                     deletedAt: null,
                     deletedById: null,
                     originalSlug: null,
                     slug: originalSlug,
                     sortOrder: await nextSortOrder(tx, 'projects'),
                     ...publicationChange(EntityStatus.draft, EntityStatus.draft),
                  },
               });
               await this.syncRedirects(tx, id, locked.slug, originalSlug, false);
               return this.findDetail(tx, id);
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         PROJECT_SAVE_ERRORS,
      );

      await this.invalidateProjectCache();
      this.adminEvents.publish(
         EditLockEntity.projects,
         id,
         AdminEventAction.restored,
         restored.version,
      );
      return restored;
   }

   async findTrashed(query: PaginationQueryDto) {
      const retentionDays = this.config.getOrThrow<number>('app.trashRetentionDays');
      const where = {
         ...IN_TRASH,
         ...buildSearchWhere(query.search, ['title', 'originalSlug']),
      };
      const [rows, totalCount] = await this.prisma.$transaction([
         this.prisma.project.findMany({
            where,
            select: {
               id: true,
               title: true,
               originalSlug: true,
               deletedAt: true,
               deletedBy: { select: AUTHOR_SELECT },
            },
            ...buildPaginationArgs(query),
            orderBy: buildOrderBy(
               query,
               { deletedAt: 'deletedAt', title: 'title' },
               'deletedAt',
               'desc',
            ),
         }),
         this.prisma.project.count({ where }),
      ]);
      return {
         data: rows.map((row) => toTrashedItem(row, retentionDays)),
         totalCount,
      };
   }

   async removePermanently(id: number) {
      const removed = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await lockProject(tx, id, 'trashed');
               const project = await tx.project.findUniqueOrThrow({
                  where: { id, ...IN_TRASH },
                  select: { title: true, originalSlug: true },
               });
               await tx.projectTranslation.deleteMany({ where: { projectId: id } });
               await tx.projectTag.deleteMany({ where: { projectId: id } });
               await tx.projectLink.deleteMany({ where: { projectId: id } });
               await tx.projectMedia.deleteMany({ where: { projectId: id } });
               await deleteSlugRedirects(tx, SlugRedirectResource.project, id);
               await tx.project.delete({ where: { id } });
               return project;
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         PROJECT_SAVE_ERRORS,
      );
      this.adminEvents.publish(EditLockEntity.projects, id, AdminEventAction.deleted, null);
      return removed;
   }

   async findExpiredTrashIds(cutoff: Date, limit: number, excludeIds: number[] = []) {
      const rows = await this.prisma.project.findMany({
         where: { deletedAt: { lt: cutoff }, id: { notIn: excludeIds } },
         select: { id: true },
         orderBy: [{ deletedAt: 'asc' }, { id: 'asc' }],
         take: limit,
      });
      return rows.map((row) => row.id);
   }

   async upsertTranslation(
      projectId: number,
      language: Language,
      dto: Partial<UpsertTranslationDto>,
      actor: SaveActor,
   ) {
      const record = { id: projectId, expectedVersion: dto.version };
      const result = await this.editProject(record, actor, async (tx) => {
         const existing = await tx.projectTranslation.findUnique({
            where: { projectId_language: { projectId, language } },
         });

         let translation;
         if (existing) {
            const update = {
               ...(dto.title !== undefined && { title: dto.title.trim() }),
               ...(dto.role !== undefined && { role: dto.role?.trim() || null }),
               ...(dto.description !== undefined && {
                  description: sanitizePlainText(dto.description),
               }),
               ...(dto.content !== undefined && {
                  content: sanitizeRichText(dto.content),
               }),
               ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
               ...(dto.metaDescription !== undefined && {
                  metaDescription: dto.metaDescription,
               }),
            };
            translation = await tx.projectTranslation.update({
               where: { projectId_language: { projectId, language } },
               data: update,
            });
         } else {
            const title = dto.title?.trim();
            if (!title) {
               throw new BadRequestException('title is required when creating a new translation');
            }
            translation = await tx.projectTranslation.create({
               data: {
                  projectId,
                  language,
                  title,
                  role: dto.role?.trim() || null,
                  description: sanitizePlainText(dto.description),
                  content: sanitizeRichText(dto.content),
                  metaTitle: dto.metaTitle ?? null,
                  metaDescription: dto.metaDescription ?? null,
               },
            });
         }

         await this.syncTitle(projectId, tx);
         return translation;
      });

      await this.invalidateProjectCache();
      return result;
   }

   private async syncTitle(projectId: number, client: Prisma.TransactionClient = this.prisma) {
      const translation = await client.projectTranslation.findFirst({
         where: { projectId },
         orderBy: { language: 'asc' },
         select: { title: true },
      });
      await client.project.update({
         where: { id: projectId },
         data: { title: translation?.title ?? '' },
      });
   }

   async deleteTranslation(projectId: number, language: Language, actor: SaveActor) {
      await this.editProject({ id: projectId }, actor, async (tx) => {
         const translation = await tx.projectTranslation.findUnique({
            where: { projectId_language: { projectId, language } },
         });

         if (!translation) {
            throw new NotFoundException('Translation not found');
         }
         const othersWithTitle = await tx.projectTranslation.count({
            where: { projectId, language: { not: language }, title: { not: '' } },
         });
         if (othersWithTitle === 0) {
            throw new BadRequestException(LAST_TRANSLATION_MESSAGE);
         }

         await tx.projectTranslation.delete({
            where: { projectId_language: { projectId, language } },
         });

         await this.syncTitle(projectId, tx);
      });

      await this.invalidateProjectCache();
   }

   async addMedia(projectId: number, dto: AddProjectMediaDto, actor: SaveActor) {
      const record = { id: projectId, expectedVersion: dto.version };
      const result = await this.editProject(record, actor, async (tx) => {
         const file = await tx.file.findUnique({
            where: { id: dto.fileId, ...NOT_TRASHED },
            select: { id: true },
         });
         if (!file) {
            throw new NotFoundException('File not found');
         }

         return tx.projectMedia.create({
            data: {
               projectId,
               fileId: dto.fileId,
               language: dto.language,
               sortOrder: dto.sortOrder ?? 0,
            },
         });
      });
      await this.invalidateProjectCache();
      return result;
   }

   async removeMedia(projectId: number, mediaId: number, actor: SaveActor) {
      await this.editProject({ id: projectId }, actor, async (tx) => {
         const media = await tx.projectMedia.findUnique({
            where: { id: mediaId },
         });

         if (!media || media.projectId !== projectId) {
            throw new NotFoundException('Media not found');
         }

         await tx.projectMedia.delete({ where: { id: mediaId } });
      });
      await this.invalidateProjectCache();
   }

   async sortMedia(projectId: number, dto: SortProjectMediaDto, actor: SaveActor) {
      const record = { id: projectId, expectedVersion: dto.version };
      await this.editProject(record, actor, async (tx) => {
         // trash-ok: every media row, a trashed file's too (the detail lists it as well)
         const media = await tx.projectMedia.findMany({
            where: { projectId },
            select: { id: true },
         });
         assertSameIds(
            dto.mediaIds,
            media.map((m) => m.id),
            {
               duplicates: 'Provided media IDs must not contain duplicates',
               count: 'The number of provided media IDs does not match the number of media in the project',
               unknown: (id) => `Media ${id} not found in this project`,
            },
         );

         await writeSortOrders(
            tx,
            'project_media',
            dto.mediaIds.map((id, sortOrder) => ({ id, sortOrder })),
         );
      });
      await this.invalidateProjectCache();
   }

   async assignLinks(projectId: number, dto: AssignProjectLinksDto, actor: SaveActor) {
      const record = { id: projectId, expectedVersion: dto.version };
      const result = await this.editProject(record, actor, async (tx) => {
         await tx.projectLink.deleteMany({ where: { projectId } });
         await tx.projectLink.createMany({
            data: dto.links.map((link, index) => ({
               projectId,
               label: link.label?.trim() || null,
               url: link.url,
               sortOrder: index,
            })),
         });
         return this.findDetail(tx, projectId);
      });

      await this.invalidateProjectCache();
      return result;
   }

   async assignTags(projectId: number, dto: AssignTagsDto, actor: SaveActor) {
      const record = { id: projectId, expectedVersion: dto.version };
      const result = await this.editProject(record, actor, async (tx) => {
         const uniqueTagIds = [...new Set(dto.tagIds)];
         const tagsCount = await tx.tag.count({
            where: { id: { in: uniqueTagIds }, ...NOT_TRASHED },
         });

         if (tagsCount !== uniqueTagIds.length) {
            throw new NotFoundException('One or more tags could not be found');
         }

         await tx.projectTag.deleteMany({ where: { projectId, tag: NOT_TRASHED } });
         await tx.projectTag.createMany({
            data: dto.tagIds.map((tagId, index) => ({ projectId, tagId, sortOrder: index })),
            skipDuplicates: true,
         });
         return this.findDetail(tx, projectId);
      });

      await this.invalidateProjectCache();
      return result;
   }

   async sortTags(projectId: number, dto: SortProjectTagsDto, actor: SaveActor) {
      const record = { id: projectId, expectedVersion: dto.version };
      await this.editProject(record, actor, async (tx) => {
         const tags = await tx.projectTag.findMany({
            where: { projectId, tag: NOT_TRASHED },
            select: { tagId: true },
         });
         assertSameIds(
            dto.tagIds,
            tags.map((t) => t.tagId),
            {
               duplicates: 'Provided tag IDs must not contain duplicates',
               count: 'The number of provided tags does not match the number of tags assigned to the project',
               unknown: (tagId) => `Tag ${tagId} is not assigned to this project`,
            },
         );

         for (const [index, tagId] of dto.tagIds.entries()) {
            await tx.projectTag.update({
               where: { projectId_tagId: { projectId, tagId } },
               data: { sortOrder: index },
            });
         }
      });
      await this.invalidateProjectCache();
   }

   async findBulkNames(ids: number[], tagId?: number) {
      const [projects, tag] = await Promise.all([
         this.prisma.project.findMany({
            where: { id: { in: ids }, ...NOT_TRASHED },
            select: { id: true, title: true },
         }),
         tagId === undefined
            ? Promise.resolve(null)
            : this.prisma.tag.findUnique({
                 where: { id: tagId, ...NOT_TRASHED },
                 select: { translations: TAG_TRANSLATIONS_SELECT },
              }),
      ]);
      return {
         titles: new Map(projects.map((p) => [p.id, p.title])),
         tagName: tag ? tagName(tag) : null,
      };
   }

   async generateTranslation(
      projectId: number,
      targetLanguage: Language,
      sourceFields: {
         title: string;
         description?: string | null;
         content?: string | null;
         metaTitle?: string | null;
         metaDescription?: string | null;
      },
      userId: number,
   ): Promise<GenerateProjectTranslationResponseDto> {
      const exists = await this.prisma.project.findUnique({
         where: { id: projectId, ...NOT_TRASHED },
         select: { id: true },
      });
      if (!exists) throw new NotFoundException('Project not found');
      assertTranslationSourceSize(sourceFields);
      await assertTranslationWithinLimit(this.rateLimit, userId);

      return translateFields(this.prompts, targetLanguage, sourceFields, TRANSLATION_SCHEMA);
   }

   async addTag(projectId: number, tagId: number, actor: SaveActor) {
      const result = await this.editProject({ id: projectId }, actor, async (tx) => {
         const tag = await tx.tag.findUnique({
            where: { id: tagId, ...NOT_TRASHED },
            select: { id: true },
         });
         if (!tag) throw new NotFoundException('Tag not found');

         const assigned = await tx.projectTag.findMany({
            where: { projectId, tag: NOT_TRASHED },
            select: { tagId: true, sortOrder: true },
         });
         const added = !assigned.some((row) => row.tagId === tagId);
         if (added) {
            const sortOrder = Math.max(-1, ...assigned.map((row) => row.sortOrder)) + 1;
            await tx.projectTag.create({ data: { projectId, tagId, sortOrder } });
         }
         return { added, project: await this.findDetail(tx, projectId) };
      });

      if (result.added) await this.invalidateProjectCache();
      return result;
   }

   async removeTag(projectId: number, tagId: number, actor: SaveActor) {
      await this.editProject({ id: projectId }, actor, async (tx) => {
         const projectTag = await tx.projectTag.findUnique({
            where: { projectId_tagId: { projectId, tagId } },
         });

         if (!projectTag) {
            throw new NotFoundException('Tag not assigned to this project');
         }

         await tx.projectTag.delete({
            where: { projectId_tagId: { projectId, tagId } },
         });
      });
      await this.invalidateProjectCache();
   }

   async findAllPublished(query: PaginationQueryDto, language?: Language, homepageOnly?: boolean) {
      const cacheKey = this.projectListKey(query, language, homepageOnly);
      const cached = await this.cache.get<{ data: unknown[]; totalCount: number }>(cacheKey);
      if (cached) return cached;

      const where = {
         ...NOT_TRASHED,
         status: EntityStatus.published,
         ...(homepageOnly && { showOnHomepage: true }),
         ...(language && { translations: { some: { language } } }),
      };

      const [projects, totalCount] = await this.prisma.$transaction([
         this.prisma.project.findMany({
            where,
            include: publicProjectInclude(language),
            ...buildPaginationArgs(query),
            orderBy: buildOrderBy(
               query,
               { sortOrder: 'sortOrder', createdAt: 'createdAt', slug: 'slug' },
               'sortOrder',
            ),
         }),
         this.prisma.project.count({ where }),
      ]);

      const result = { data: projects.map((p) => this.toPublicProject(p)), totalCount };
      void this.cache.set(cacheKey, result, CACHE_TTL_LIST);
      return result;
   }

   async findBySlug(slug: string, language?: Language, preview = false) {
      if (!preview) {
         const cacheKey = this.projectSlugKey(slug, language);
         const cached = await this.cache.get<ReturnType<typeof this.toPublicProject>>(cacheKey);
         if (cached) return cached;
      }

      const project = await this.prisma.project.findFirst({
         where: { slug, ...NOT_TRASHED, ...(preview ? {} : { status: EntityStatus.published }) },
         include: publicProjectInclude(language),
      });

      if (!project) {
         throw new NotFoundException('Project not found');
      }

      const result = this.toPublicProject(project);

      if (!preview) {
         void this.cache.set(this.projectSlugKey(slug, language), result, CACHE_TTL_DETAIL);
      }

      return result;
   }

   async findRedirect(slug: string): Promise<SlugRedirectEntity> {
      const cacheKey = `${CACHE_KEY_PREFIX}:redirect:${slug}`;
      const cached = await this.cache.get<SlugRedirectEntity>(cacheKey);
      if (cached) return cached;

      const target = await findRedirectSlug(this.prisma, SlugRedirectResource.project, slug);
      if (target === null) throw new NotFoundException('Redirect not found');

      const result = { slug: target };
      void this.cache.set(cacheKey, result, CACHE_TTL_REDIRECT);
      return result;
   }
}
