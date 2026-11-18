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
import { createAtEnd, lockOrder, moveInTable, nextSortOrder } from '@/common/sort/ordered-table';
import { IN_TRASH, NOT_TRASHED, toTrashedItem, trashedSlug } from '@/common/trash/trash';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Prisma } from '@/generated/prisma/client';
import { EntityStatus, Language, SlugRedirectResource } from '@/generated/prisma/enums';
import { lockService } from '@/prisma/aggregate-lock.helper';
import {
   buildOrderBy,
   buildPaginationArgs,
   buildSearchWhere,
   type OrderByMap,
} from '@/prisma/pagination.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { saveConflict, type SaveErrorMessages, withSaveErrors } from '@/prisma/save-error.helper';
import { INTERACTIVE_TRANSACTION_OPTIONS } from '@/prisma/transaction.helper';
import { RateLimitService } from '@/rate-limit/rate-limit.service';
import { AdminEventsService } from '@/realtime/admin-events.service';
import { AdminEventAction } from '@/realtime/enum/admin-event-action.enum';
import { RevalidationService } from '@/revalidation/revalidation.service';

import { AssignProjectsDto } from './dto/assign-projects.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import type { GenerateServiceTranslationResponseDto } from './dto/generate-service-translation-response.dto';
import type { SaveServiceDto, SaveServiceTranslationDto } from './dto/save-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpsertServiceTranslationDto } from './dto/upsert-service-translation.dto';

const CACHE_TTL_LIST = 300;
const CACHE_TTL_DETAIL = 300;
const CACHE_TTL_REDIRECT = 300;
const CACHE_KEY_PREFIX = 'services:v3';

export const SERVICE_ORDER_BY = {
   sortOrder: 'sortOrder',
   createdAt: 'createdAt',
   updatedAt: 'updatedAt',
   status: 'status',
   title: 'title',
   createdBy: (order) => [{ createdBy: { lastName: order } }, { createdBy: { firstName: order } }],
} satisfies OrderByMap;

const SLUG_CONFLICT_MESSAGE = 'Service with this slug already exists';

const TRANSLATION_SCHEMA = z.object({
   title: z.string(),
   description: z.string().nullable(),
   content: z.string().nullable(),
});

const LAST_TRANSLATION_MESSAGE = 'The last translation with a title cannot be deleted';

const SERVICE_SAVE_ERRORS: SaveErrorMessages = {
   uniqueTaken: { field: 'slug', message: SLUG_CONFLICT_MESSAGE, code: ApiErrorCode.SLUG_TAKEN },
   referenceMissing: 'One or more projects could not be found',
};

type ServiceClient = PrismaService | Prisma.TransactionClient;

export const titledTranslations = (translations: SaveServiceTranslationDto[]) => {
   const titled = translations.filter((translation) => translation.title.trim().length > 0);
   if (titled.length === 0) {
      throw new BadRequestException('At least one translation needs a title');
   }
   return titled;
};

@Injectable()
export class ServiceService {
   constructor(
      private prisma: PrismaService,
      private cache: CacheService,
      private prompts: PromptRegistryService,
      private revalidation: RevalidationService,
      private adminEvents: AdminEventsService,
      private config: ConfigService,
      private rateLimit: RateLimitService,
   ) {}

   private serviceListKey(
      query: PaginationQueryDto,
      language?: Language,
      homepageOnly?: boolean,
   ): string {
      const { page = 0, limit = 100, sortBy, sortOrder } = query;
      return `${CACHE_KEY_PREFIX}:list:${language ?? 'all'}:${page}:${limit}:${sortBy ?? 'default'}:${sortOrder ?? 'asc'}:${homepageOnly ? '1' : '0'}`;
   }

   private serviceSlugKey(slug: string, language?: Language): string {
      return `${CACHE_KEY_PREFIX}:slug:${slug}:${language ?? 'all'}`;
   }

   private async invalidateServiceCache(): Promise<void> {
      await this.cache.delPattern('services:*');
      this.revalidation.revalidate('services');
   }

   private buildProjectsInclude(language?: Language, publishedOnly = false) {
      return {
         where: {
            project: { ...NOT_TRASHED, ...(publishedOnly && { status: EntityStatus.published }) },
         },
         include: {
            project: {
               select: {
                  id: true,
                  slug: true,
                  translations: {
                     ...(language ? { where: { language } } : {}),
                     select: { language: true, title: true },
                     orderBy: { language: Prisma.SortOrder.asc },
                  },
               },
            },
         },
         orderBy: { sortOrder: Prisma.SortOrder.asc },
      };
   }

   async create(dto: CreateServiceDto) {
      const existing = await this.prisma.service.findUnique({
         where: { slug: dto.slug, ...NOT_TRASHED },
      });
      if (existing) throw new ConflictException('Service with this slug already exists');

      const title = dto.title.trim();
      const result = await createAtEnd(this.prisma, 'services', async (tx, sortOrder) => {
         const created = await tx.service.create({
            data: {
               title,
               slug: dto.slug,
               sortOrder,
               translations: {
                  create: {
                     language: dto.language,
                     title,
                     description: sanitizePlainText(dto.description),
                     content: sanitizeRichText(dto.content),
                  },
               },
            },
            include: { translations: true, projects: this.buildProjectsInclude() },
         });
         await this.syncRedirects(tx, created.id, null, created.slug, false);
         return created;
      });
      await this.invalidateServiceCache();
      this.adminEvents.publish(EditLockEntity.services, result.id, AdminEventAction.created, 0);
      return result;
   }

   private syncRedirects(
      tx: Prisma.TransactionClient,
      id: number,
      oldSlug: string | null,
      newSlug: string,
      wasPublished: boolean,
   ) {
      return syncSlugRedirects(tx, SlugRedirectResource.service, {
         id,
         oldSlug,
         newSlug,
         wasPublished,
      });
   }

   async findAll(query: StatusFilterQueryDto) {
      const where = {
         ...NOT_TRASHED,
         ...buildSearchWhere(query.search, ['title', 'slug']),
         ...(query.status && { status: query.status }),
      };
      const [data, totalCount] = await this.prisma.$transaction([
         this.prisma.service.findMany({
            where,
            include: {
               translations: true,
               projects: this.buildProjectsInclude(),
               createdBy: { select: AUTHOR_SELECT },
            },
            ...buildPaginationArgs(query),
            orderBy: buildOrderBy(query, SERVICE_ORDER_BY, 'sortOrder'),
         }),
         this.prisma.service.count({ where }),
      ]);

      return { data, totalCount };
   }

   async findOne(id: number) {
      const service = await this.prisma.service.findUnique({
         where: { id, ...NOT_TRASHED },
         include: { translations: true, projects: this.buildProjectsInclude() },
      });

      if (!service) {
         throw new NotFoundException('Service not found');
      }

      return service;
   }

   findLookupCandidates(take: number) {
      return this.prisma.service.findMany({
         where: NOT_TRASHED,
         select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            translations: { select: { language: true, title: true } },
         },
         orderBy: [{ updatedAt: Prisma.SortOrder.desc }, { id: Prisma.SortOrder.desc }],
         take,
      });
   }

   private async writeService<T>(
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
               const current = await lockService(tx, id);
               version = await incrementVersion(tx, { table: 'services', id, expectedVersion });
               return write(tx, current);
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         SERVICE_SAVE_ERRORS,
      );
      this.adminEvents.publish(EditLockEntity.services, id, action, version);
      return result;
   }

   private editService<T>(
      record: VersionedRecord,
      actor: SaveActor,
      write: (
         tx: Prisma.TransactionClient,
         current: { status: EntityStatus; slug: string },
      ) => Promise<T>,
   ): Promise<T> {
      return this.writeService(record, (tx, current) => {
         assertEditAllowed(current.status, actor.canPublish);
         return write(tx, current);
      });
   }

   async update(id: number, dto: UpdateServiceDto, actor: SaveActor) {
      const record = { id, expectedVersion: dto.version };
      const result = await this.editService(record, actor, async (tx, current) => {
         if (dto.slug) await this.assertSlugAvailable(tx, dto.slug, id);

         const updated = await tx.service.update({
            where: { id },
            data: {
               ...(dto.slug && { slug: dto.slug }),
               ...(dto.showOnHomepage !== undefined && { showOnHomepage: dto.showOnHomepage }),
            },
            include: { translations: true, projects: this.buildProjectsInclude() },
         });
         if (dto.slug) {
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
      await this.invalidateServiceCache();
      return result;
   }

   async move(id: number, dto: MoveItemDto, actor: SaveActor) {
      const { moved, version } = await moveInTable(this.prisma, {
         table: 'services',
         id,
         targetId: dto.targetId,
         position: dto.position,
         expectedVersion: dto.version,
         canPublish: actor.canPublish,
      });
      if (moved > 0) await this.invalidateServiceCache();
      this.adminEvents.publish(EditLockEntity.services, id, AdminEventAction.moved, version);
   }

   async updateStatus(id: number, dto: UpdateStatusDto) {
      const record = { id, expectedVersion: dto.version };
      const result = await this.writeService(record, (tx, current) =>
         tx.service.update({
            where: { id },
            data: publicationChange(dto.status, current.status),
            include: { translations: true, projects: this.buildProjectsInclude() },
         }),
      );
      await this.invalidateServiceCache();
      return result;
   }

   async trash(id: number, userId: number | null) {
      await this.writeService(
         { id },
         async (tx, current) => {
            const { slug } = await tx.service.findUniqueOrThrow({
               where: { id, ...NOT_TRASHED },
               select: { slug: true },
            });
            await tx.service.update({
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
      await this.invalidateServiceCache();
   }

   async restore(id: number) {
      const restored = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await lockOrder(tx, 'services');
               const locked = await lockService(tx, id, 'trashed');
               await incrementVersion(tx, { table: 'services', id });
               const { originalSlug } = await tx.service.findUniqueOrThrow({
                  where: { id, ...IN_TRASH },
                  select: { originalSlug: true },
               });
               if (!originalSlug) throw new NotFoundException('Service not found in the trash');
               const owner = await tx.service.findUnique({
                  where: { slug: originalSlug },
                  select: { id: true },
               });
               if (owner) {
                  throw new ConflictException(
                     `Cannot restore: another service already uses the slug "${originalSlug}"`,
                  );
               }
               await tx.service.update({
                  where: { id },
                  data: {
                     deletedAt: null,
                     deletedById: null,
                     originalSlug: null,
                     slug: originalSlug,
                     sortOrder: await nextSortOrder(tx, 'services'),
                     ...publicationChange(EntityStatus.draft, EntityStatus.draft),
                  },
               });
               await this.syncRedirects(tx, id, locked.slug, originalSlug, false);
               return this.findDetail(tx, id);
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         SERVICE_SAVE_ERRORS,
      );
      await this.invalidateServiceCache();
      this.adminEvents.publish(
         EditLockEntity.services,
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
         this.prisma.service.findMany({
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
         this.prisma.service.count({ where }),
      ]);
      return { data: rows.map((row) => toTrashedItem(row, retentionDays)), totalCount };
   }

   async removePermanently(id: number) {
      const removed = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await lockService(tx, id, 'trashed');
               const service = await tx.service.findUniqueOrThrow({
                  where: { id, ...IN_TRASH },
                  select: { title: true, originalSlug: true },
               });
               await deleteSlugRedirects(tx, SlugRedirectResource.service, id);
               await tx.service.delete({ where: { id } });
               return service;
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         SERVICE_SAVE_ERRORS,
      );
      this.adminEvents.publish(EditLockEntity.services, id, AdminEventAction.deleted, null);
      return removed;
   }

   async findExpiredTrashIds(cutoff: Date, limit: number, excludeIds: number[] = []) {
      const rows = await this.prisma.service.findMany({
         where: { deletedAt: { lt: cutoff }, id: { notIn: excludeIds } },
         select: { id: true },
         orderBy: [{ deletedAt: 'asc' }, { id: 'asc' }],
         take: limit,
      });
      return rows.map((row) => row.id);
   }

   async upsertTranslation(
      serviceId: number,
      language: Language,
      dto: Partial<UpsertServiceTranslationDto>,
      actor: SaveActor,
   ) {
      const record = { id: serviceId, expectedVersion: dto.version };
      const result = await this.editService(record, actor, async (tx) => {
         const existing = await tx.serviceTranslation.findUnique({
            where: { serviceId_language: { serviceId, language } },
         });

         let translation;
         if (existing) {
            const update = {
               ...(dto.title !== undefined && { title: dto.title.trim() }),
               ...(dto.description !== undefined && {
                  description: sanitizePlainText(dto.description),
               }),
               ...(dto.content !== undefined && {
                  content: sanitizeRichText(dto.content),
               }),
               ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle.trim() || null }),
               ...(dto.metaDescription !== undefined && {
                  metaDescription: dto.metaDescription.trim() || null,
               }),
            };
            translation = await tx.serviceTranslation.update({
               where: { serviceId_language: { serviceId, language } },
               data: update,
            });
         } else {
            const title = dto.title?.trim();
            if (!title) {
               throw new BadRequestException('title is required when creating a new translation');
            }
            translation = await tx.serviceTranslation.create({
               data: {
                  serviceId,
                  language,
                  title,
                  description: sanitizePlainText(dto.description),
                  content: sanitizeRichText(dto.content),
                  metaTitle: dto.metaTitle?.trim() || null,
                  metaDescription: dto.metaDescription?.trim() || null,
               },
            });
         }

         await this.syncTitle(serviceId, tx);
         return translation;
      });

      await this.invalidateServiceCache();
      return result;
   }

   private async syncTitle(serviceId: number, client: ServiceClient = this.prisma) {
      const translation = await client.serviceTranslation.findFirst({
         where: { serviceId },
         orderBy: { language: 'asc' },
         select: { title: true },
      });
      await client.service.update({
         where: { id: serviceId },
         data: { title: translation?.title ?? '' },
      });
   }

   async generateTranslation(
      serviceId: number,
      targetLanguage: Language,
      sourceFields: {
         title: string;
         description?: string | null;
         content?: string | null;
      },
      userId: number,
   ): Promise<GenerateServiceTranslationResponseDto> {
      const exists = await this.prisma.service.findUnique({
         where: { id: serviceId, ...NOT_TRASHED },
         select: { id: true },
      });
      if (!exists) throw new NotFoundException('Service not found');
      assertTranslationSourceSize(sourceFields);
      await assertTranslationWithinLimit(this.rateLimit, userId);

      return translateFields(this.prompts, targetLanguage, sourceFields, TRANSLATION_SCHEMA);
   }

   async deleteTranslation(serviceId: number, language: Language, actor: SaveActor) {
      await this.editService({ id: serviceId }, actor, async (tx) => {
         const translation = await tx.serviceTranslation.findUnique({
            where: { serviceId_language: { serviceId, language } },
         });

         if (!translation) {
            throw new NotFoundException('Translation not found');
         }
         const othersWithTitle = await tx.serviceTranslation.count({
            where: { serviceId, language: { not: language }, title: { not: '' } },
         });
         if (othersWithTitle === 0) {
            throw new BadRequestException(LAST_TRANSLATION_MESSAGE);
         }

         await tx.serviceTranslation.delete({
            where: { serviceId_language: { serviceId, language } },
         });

         await this.syncTitle(serviceId, tx);
      });
      await this.invalidateServiceCache();
   }

   async assignProjects(serviceId: number, dto: AssignProjectsDto, actor: SaveActor) {
      const record = { id: serviceId, expectedVersion: dto.version };
      const result = await this.editService(record, actor, async (tx) => {
         await this.replaceProjects(tx, serviceId, dto.projectIds);
         return this.findDetail(tx, serviceId);
      });
      await this.invalidateServiceCache();
      return result;
   }

   private async replaceProjects(
      tx: Prisma.TransactionClient,
      serviceId: number,
      projectIds: number[],
   ) {
      const uniqueProjectIds = [...new Set(projectIds)];

      if (!(await this.lockProjects(tx, uniqueProjectIds))) {
         throw new NotFoundException('One or more projects could not be found');
      }

      await tx.serviceProject.deleteMany({ where: { serviceId, project: NOT_TRASHED } });

      if (uniqueProjectIds.length > 0) {
         await tx.serviceProject.createMany({
            data: uniqueProjectIds.map((projectId, index) => ({
               serviceId,
               projectId,
               sortOrder: index,
            })),
         });
      }
   }

   private async lockProjects(tx: Prisma.TransactionClient, projectIds: number[]) {
      if (projectIds.length === 0) return true;
      const locked = await tx.$queryRaw<{ id: number }[]>(
         Prisma.sql`SELECT id FROM projects WHERE id IN (${Prisma.join(projectIds)})
            AND deleted_at IS NULL ORDER BY id FOR KEY SHARE`,
      );
      return locked.length === projectIds.length;
   }

   async addProject(serviceId: number, projectId: number, actor: SaveActor) {
      const result = await this.editService({ id: serviceId }, actor, async (tx) => {
         if (!(await this.lockProjects(tx, [projectId]))) {
            throw new NotFoundException('Project not found');
         }

         // trash-ok: the links of the service as stored, the live project was locked above.
         const linked = await tx.serviceProject.findMany({
            where: { serviceId },
            select: { projectId: true, sortOrder: true },
         });
         const added = !linked.some((row) => row.projectId === projectId);
         if (added) {
            const sortOrder = Math.max(-1, ...linked.map((row) => row.sortOrder)) + 1;
            await tx.serviceProject.create({ data: { serviceId, projectId, sortOrder } });
         }
         return { added, service: await this.findDetail(tx, serviceId) };
      });

      if (result.added) await this.invalidateServiceCache();
      return result;
   }

   async removeProject(serviceId: number, projectId: number, actor: SaveActor) {
      const result = await this.editService({ id: serviceId }, actor, async (tx) => {
         await this.lockProjects(tx, [projectId]);
         const { count } = await tx.serviceProject.deleteMany({ where: { serviceId, projectId } });
         return { removed: count > 0, service: await this.findDetail(tx, serviceId) };
      });

      if (result.removed) await this.invalidateServiceCache();
      return result;
   }

   private findDetail(client: ServiceClient, id: number) {
      return client.service.findUniqueOrThrow({
         where: { id, ...NOT_TRASHED },
         include: { translations: true, projects: this.buildProjectsInclude() },
      });
   }

   private async assertSlugAvailable(client: ServiceClient, slug: string, exceptId?: number) {
      const existing = await client.service.findFirst({
         where: { slug, ...NOT_TRASHED, ...(exceptId !== undefined && { id: { not: exceptId } }) },
         select: { id: true },
      });
      if (existing) throw saveConflict(SLUG_CONFLICT_MESSAGE, ApiErrorCode.SLUG_TAKEN);
   }

   private async writeTranslations(
      tx: Prisma.TransactionClient,
      serviceId: number,
      translations: SaveServiceTranslationDto[],
   ) {
      for (const {
         language,
         title,
         description,
         content,
         metaTitle,
         metaDescription,
      } of translations) {
         const fields = {
            title: title.trim(),
            description: sanitizePlainText(description),
            content: sanitizeRichText(content),
            metaTitle: metaTitle?.trim() || null,
            metaDescription: metaDescription?.trim() || null,
         };
         await tx.serviceTranslation.upsert({
            where: { serviceId_language: { serviceId, language } },
            create: { serviceId, language, ...fields },
            update: fields,
         });
      }
   }

   async saveNew(dto: SaveServiceDto, actor: SaveActor) {
      const translations = titledTranslations(dto.translations);
      assertStatusChangeAllowed(null, dto.status, actor.canPublish);
      const status = dto.status ?? EntityStatus.draft;

      const result = await withSaveErrors(
         () =>
            createAtEnd(this.prisma, 'services', async (tx, sortOrder) => {
               await this.assertSlugAvailable(tx, dto.slug);

               const { id } = await tx.service.create({
                  data: {
                     slug: dto.slug,
                     showOnHomepage: dto.showOnHomepage,
                     ...publicationChange(status, null),
                     sortOrder,
                     createdById: actor.userId,
                  },
                  select: { id: true },
               });
               await this.writeTranslations(tx, id, translations);
               await this.syncTitle(id, tx);
               await this.replaceProjects(tx, id, dto.projectIds);
               await this.syncRedirects(tx, id, null, dto.slug, false);

               return this.findDetail(tx, id);
            }),
         SERVICE_SAVE_ERRORS,
      );
      await this.invalidateServiceCache();
      this.adminEvents.publish(EditLockEntity.services, result.id, AdminEventAction.created, 0);
      return result;
   }

   async save(id: number, dto: SaveServiceDto, actor: SaveActor) {
      const translations = titledTranslations(dto.translations);

      const record = { id, expectedVersion: dto.version };
      const result = await this.writeService(record, async (tx, current) => {
         assertSaveAllowed(current.status, dto.status, actor.canPublish);
         const statusChange =
            dto.status !== undefined && dto.status !== current.status ? dto.status : undefined;

         await this.assertSlugAvailable(tx, dto.slug, id);

         await tx.service.update({
            where: { id },
            data: {
               slug: dto.slug,
               showOnHomepage: dto.showOnHomepage,
               ...publicationChange(statusChange, current.status),
            },
         });
         await this.syncRedirects(
            tx,
            id,
            current.slug,
            dto.slug,
            current.status === EntityStatus.published,
         );
         await this.writeTranslations(tx, id, translations);
         await this.syncTitle(id, tx);
         await this.replaceProjects(tx, id, dto.projectIds);

         return this.findDetail(tx, id);
      });
      await this.invalidateServiceCache();
      return result;
   }

   async findAllPublished(
      query: PaginationQueryDto,
      language?: Language,
      homepageOnly?: boolean,
      preview = false,
   ) {
      const cacheKey = this.serviceListKey(query, language, homepageOnly);
      if (!preview) {
         const cached = await this.cache.get<{ data: unknown[]; totalCount: number }>(cacheKey);
         if (cached) return cached;
      }

      const where = {
         ...NOT_TRASHED,
         ...(!preview && { status: EntityStatus.published }),
         ...(homepageOnly && { showOnHomepage: true }),
      };
      const [data, totalCount] = await this.prisma.$transaction([
         this.prisma.service.findMany({
            where,
            omit: { createdById: true, version: true },
            include: {
               translations: language ? { where: { language } } : true,
               projects: this.buildProjectsInclude(language, !preview),
            },
            ...buildPaginationArgs(query),
            orderBy: buildOrderBy(
               query,
               { sortOrder: 'sortOrder', createdAt: 'createdAt', slug: 'slug' },
               'sortOrder',
            ),
         }),
         this.prisma.service.count({ where }),
      ]);

      const result = { data, totalCount };
      if (!preview) {
         void this.cache.set(cacheKey, result, CACHE_TTL_LIST);
      }
      return result;
   }

   async findBySlug(slug: string, language?: Language, preview = false) {
      if (!preview) {
         const cacheKey = this.serviceSlugKey(slug, language);
         const cached = await this.cache.get<unknown>(cacheKey);
         if (cached) return cached;
      }

      const service = await this.prisma.service.findFirst({
         where: { slug, ...NOT_TRASHED, ...(preview ? {} : { status: EntityStatus.published }) },
         omit: { createdById: true, version: true },
         include: {
            translations: language ? { where: { language } } : true,
            projects: this.buildProjectsInclude(language, !preview),
         },
      });

      if (!service) {
         throw new NotFoundException('Service not found');
      }

      if (!preview) {
         void this.cache.set(this.serviceSlugKey(slug, language), service, CACHE_TTL_DETAIL);
      }

      return service;
   }

   async findRedirect(slug: string): Promise<SlugRedirectEntity> {
      const cacheKey = `${CACHE_KEY_PREFIX}:redirect:${slug}`;
      const cached = await this.cache.get<SlugRedirectEntity>(cacheKey);
      if (cached) return cached;

      const target = await findRedirectSlug(this.prisma, SlugRedirectResource.service, slug);
      if (target === null) throw new NotFoundException('Redirect not found');

      const result = { slug: target };
      void this.cache.set(cacheKey, result, CACHE_TTL_REDIRECT);
      return result;
   }
}
