import {
   BadRequestException,
   ConflictException,
   Injectable,
   NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CacheService } from '@/cache/cache.service';
import { AUTHOR_SELECT } from '@/common/author/author';
import { incrementVersion } from '@/common/concurrency/record-version';
import type { MoveItemDto } from '@/common/dto/move-item.dto';
import type { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { ApiErrorCode } from '@/common/enum/api-error-code.enum';
import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import { createAtEnd, lockOrder, moveInTable, nextSortOrder } from '@/common/sort/ordered-table';
import { IN_TRASH, NOT_TRASHED, toTrashedItem, trashedSlug } from '@/common/trash/trash';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import type { Prisma } from '@/generated/prisma/client';
import { EntityStatus, Language } from '@/generated/prisma/enums';
import { lockTag } from '@/prisma/aggregate-lock.helper';
import { buildOrderBy, buildPaginationArgs } from '@/prisma/pagination.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { type SaveErrorMessages, withSaveErrors } from '@/prisma/save-error.helper';
import { AdminEventsService } from '@/realtime/admin-events.service';
import { AdminEventAction } from '@/realtime/enum/admin-event-action.enum';
import { RevalidationService } from '@/revalidation/revalidation.service';

import type { CreateTagDto } from './dto/create-tag.dto';
import type { UpdateTagDto } from './dto/update-tag.dto';
import { pickTagTranslations, TAG_TRANSLATIONS_SELECT, tagName } from './tag-translations';

const tagSearchWhere = (search: string | undefined): Prisma.TagWhereInput => {
   const term = search?.trim();
   if (!term) return {};
   return {
      OR: [
         { slug: { contains: term, mode: 'insensitive' } },
         { translations: { some: { name: { contains: term, mode: 'insensitive' } } } },
      ],
   };
};

const assertCurrentName = async (tx: Prisma.TransactionClient, id: number, expected: string) => {
   const tag = await tx.tag.findUnique({
      where: { id, ...NOT_TRASHED },
      select: { translations: TAG_TRANSLATIONS_SELECT },
   });
   if (tag && tagName(tag) !== expected.trim()) {
      throw new ConflictException(`The tag is now named "${tagName(tag)}", not "${expected}"`);
   }
};

const inOrder = <T extends { id: number }>(rows: T[], ids: number[]) => {
   const position = new Map(ids.map((id, index) => [id, index]));
   return [...rows].sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
};

const assertSlugFormat = (slug: string) => {
   if (!SLUG_REGEX.test(slug)) {
      throw new BadRequestException(SLUG_MESSAGE);
   }
};

const SLUG_CONFLICT_MESSAGE = 'Tag with this slug already exists';

const TAG_SAVE_ERRORS: SaveErrorMessages = {
   uniqueTaken: { field: 'slug', message: SLUG_CONFLICT_MESSAGE, code: ApiErrorCode.SLUG_TAKEN },
   referenceMissing: 'Tag not found',
};

@Injectable()
export class TagService {
   constructor(
      private prisma: PrismaService,
      private revalidation: RevalidationService,
      private adminEvents: AdminEventsService,
      private cache: CacheService,
      private config: ConfigService,
   ) {}

   private async invalidateProjectCache(): Promise<void> {
      await this.cache.delPattern('projects:*');
   }

   private async idsByName(
      where: Prisma.TagWhereInput,
      query: PaginationQueryDto,
      order: 'asc' | 'desc',
   ) {
      // trash-ok: `where` is the caller's (`NOT_TRASHED` for the lists, `IN_TRASH` for the trash)
      const rows = await this.prisma.tag.findMany({
         where,
         select: {
            id: true,
            translations: { where: { language: Language.cs }, select: { name: true } },
         },
      });
      const collator = new Intl.Collator('cs', { sensitivity: 'base' });
      const direction = order === 'desc' ? -1 : 1;
      const ids = rows
         .sort(
            (a, b) =>
               direction *
                  collator.compare(a.translations[0]?.name ?? '', b.translations[0]?.name ?? '') ||
               direction * (a.id - b.id),
         )
         .map((row) => row.id);
      const { skip, take } = buildPaginationArgs(query);
      return { ids: ids.slice(skip, skip + take), totalCount: ids.length };
   }

   async create(dto: CreateTagDto) {
      assertSlugFormat(dto.slug);
      const translations = pickTagTranslations(dto.translations);
      const existing = await this.prisma.tag.findUnique({
         where: { slug: dto.slug, ...NOT_TRASHED },
      });

      if (existing) {
         throw new ConflictException(SLUG_CONFLICT_MESSAGE);
      }

      const result = await withSaveErrors(
         () =>
            createAtEnd(this.prisma, 'tags', (tx, sortOrder) =>
               tx.tag.create({
                  data: {
                     slug: dto.slug,
                     color: dto.color,
                     sortOrder,
                     translations: { create: translations },
                  },
                  include: { translations: TAG_TRANSLATIONS_SELECT },
               }),
            ),
         TAG_SAVE_ERRORS,
      );
      this.revalidation.revalidate('tags');
      this.adminEvents.publish(EditLockEntity.tags, result.id, AdminEventAction.created, 0);
      return result;
   }

   async findAll(query: PaginationQueryDto) {
      const where = { ...NOT_TRASHED, ...tagSearchWhere(query.search) };
      const include = {
         translations: TAG_TRANSLATIONS_SELECT,
         createdBy: { select: AUTHOR_SELECT },
      } satisfies Prisma.TagInclude;

      const [data, totalCount] =
         query.sortBy === 'name'
            ? await this.findPageByName(where, query, (pageWhere) =>
                 this.prisma.tag.findMany({ where: pageWhere, include }),
              )
            : await this.prisma.$transaction([
                 this.prisma.tag.findMany({
                    where,
                    include,
                    ...buildPaginationArgs(query),
                    orderBy: buildOrderBy(
                       query,
                       {
                          createdAt: 'createdAt',
                          updatedAt: 'updatedAt',
                          slug: 'slug',
                          sortOrder: 'sortOrder',
                       },
                       'sortOrder',
                    ),
                 }),
                 this.prisma.tag.count({ where }),
              ]);
      return { data, totalCount };
   }

   private async findPageByName<T extends { id: number }>(
      where: Prisma.TagWhereInput,
      query: PaginationQueryDto,
      read: (pageWhere: Prisma.TagWhereInput) => Promise<T[]>,
   ) {
      const { ids, totalCount } = await this.idsByName(where, query, query.sortOrder ?? 'asc');
      const rows = await read({ AND: [where, { id: { in: ids } }] });
      return [inOrder(rows, ids), totalCount] as const;
   }

   async findOne(id: number) {
      const tag = await this.prisma.tag.findUnique({
         where: { id, ...NOT_TRASHED },
         include: {
            translations: TAG_TRANSLATIONS_SELECT,
            createdBy: { select: AUTHOR_SELECT },
         },
      });

      if (!tag) {
         throw new NotFoundException('Tag not found');
      }

      return tag;
   }

   findLookupCandidates(take: number) {
      return this.prisma.tag.findMany({
         where: NOT_TRASHED,
         select: { id: true, slug: true, translations: TAG_TRANSLATIONS_SELECT },
         orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
         take,
      });
   }

   async update(
      id: number,
      dto: UpdateTagDto,
      patch?: { removeLanguages?: Language[]; expectedName?: string },
   ) {
      const given = dto.translations && !patch ? pickTagTranslations(dto.translations) : undefined;
      let version = 0;
      const result = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const { slug: currentSlug } = await lockTag(tx, id);
               version = await incrementVersion(tx, {
                  table: 'tags',
                  id,
                  expectedVersion: dto.version,
               });
               if (patch?.expectedName !== undefined) {
                  await assertCurrentName(tx, id, patch.expectedName);
               }

               if (dto.slug) {
                  if (dto.slug !== currentSlug) assertSlugFormat(dto.slug);

                  const existing = await tx.tag.findFirst({
                     where: { slug: dto.slug, ...NOT_TRASHED, NOT: { id } },
                  });

                  if (existing) {
                     throw new ConflictException(SLUG_CONFLICT_MESSAGE);
                  }
               }

               let translations = given;
               if (patch) {
                  const removed = new Set(patch.removeLanguages ?? []);
                  const names = new Map<Language, string>(
                     (await tx.tagTranslation.findMany({ where: { tagId: id } })).map((t) => [
                        t.language,
                        t.name,
                     ]),
                  );
                  for (const { language, name } of dto.translations ?? []) {
                     if (removed.has(language)) {
                        throw new BadRequestException(
                           `Language "${language}" is both set and removed`,
                        );
                     }
                     names.set(language, name);
                  }
                  for (const language of removed) names.delete(language);
                  translations =
                     dto.translations || removed.size > 0
                        ? pickTagTranslations(
                             [...names].map(([language, name]) => ({ language, name })),
                          )
                        : undefined;
               }

               if (translations) {
                  for (const translation of translations) {
                     await tx.tagTranslation.upsert({
                        where: { tagId_language: { tagId: id, language: translation.language } },
                        create: { tagId: id, ...translation },
                        update: { name: translation.name },
                     });
                  }
                  await tx.tagTranslation.deleteMany({
                     where: { tagId: id, language: { notIn: translations.map((t) => t.language) } },
                  });
               }

               return tx.tag.update({
                  where: { id },
                  data: { slug: dto.slug, color: dto.color, updatedAt: new Date() },
                  include: { translations: TAG_TRANSLATIONS_SELECT },
               });
            }),
         TAG_SAVE_ERRORS,
      );
      await this.invalidateProjectCache();
      this.revalidation.revalidate('tags');
      this.revalidation.revalidate('projects');
      this.adminEvents.publish(EditLockEntity.tags, id, AdminEventAction.updated, version);
      return result;
   }

   async move(id: number, dto: MoveItemDto) {
      const { moved, version } = await moveInTable(this.prisma, {
         table: 'tags',
         id,
         targetId: dto.targetId,
         position: dto.position,
         expectedVersion: dto.version,
      });
      if (moved > 0) {
         await this.invalidateProjectCache();
         this.revalidation.revalidate('tags');
         this.revalidation.revalidate('projects');
      }
      this.adminEvents.publish(EditLockEntity.tags, id, AdminEventAction.moved, version);
   }

   private async publishTrashChange() {
      await this.invalidateProjectCache();
      this.revalidation.revalidate('tags');
      this.revalidation.revalidate('projects');
   }

   async trash(id: number, userId: number | null, expectedName?: string) {
      let version = 0;
      await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await lockTag(tx, id);
               version = await incrementVersion(tx, { table: 'tags', id });
               if (expectedName !== undefined) await assertCurrentName(tx, id, expectedName);
               const { slug } = await tx.tag.findUniqueOrThrow({
                  where: { id, ...NOT_TRASHED },
                  select: { slug: true },
               });
               await tx.tag.update({
                  where: { id },
                  data: {
                     deletedAt: new Date(),
                     deletedById: userId,
                     originalSlug: slug,
                     slug: trashedSlug(slug, id),
                  },
               });
            }),
         TAG_SAVE_ERRORS,
      );
      await this.publishTrashChange();
      this.adminEvents.publish(EditLockEntity.tags, id, AdminEventAction.deleted, version);
   }

   async restore(id: number) {
      const restored = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await lockOrder(tx, 'tags');
               await lockTag(tx, id, 'trashed');
               await incrementVersion(tx, { table: 'tags', id });
               const { originalSlug } = await tx.tag.findUniqueOrThrow({
                  where: { id, ...IN_TRASH },
                  select: { originalSlug: true },
               });
               if (!originalSlug) {
                  throw new NotFoundException('Tag not found in the trash');
               }
               const owner = await tx.tag.findFirst({
                  where: { slug: originalSlug },
                  select: { id: true },
               });
               if (owner) {
                  throw new ConflictException(
                     `Cannot restore: another tag already uses the slug "${originalSlug}"`,
                  );
               }
               return tx.tag.update({
                  where: { id },
                  data: {
                     deletedAt: null,
                     deletedById: null,
                     originalSlug: null,
                     slug: originalSlug,
                     sortOrder: await nextSortOrder(tx, 'tags'),
                  },
                  include: { translations: TAG_TRANSLATIONS_SELECT },
               });
            }),
         TAG_SAVE_ERRORS,
      );
      await this.publishTrashChange();
      this.adminEvents.publish(
         EditLockEntity.tags,
         id,
         AdminEventAction.restored,
         restored.version,
      );
      return restored;
   }

   async findTrashed(query: PaginationQueryDto) {
      const retentionDays = this.config.getOrThrow<number>('app.trashRetentionDays');
      const term = query.search?.trim();
      const where: Prisma.TagWhereInput = {
         ...IN_TRASH,
         ...(term && {
            OR: [
               { originalSlug: { contains: term, mode: 'insensitive' } },
               { translations: { some: { name: { contains: term, mode: 'insensitive' } } } },
            ],
         }),
      };
      const select = {
         id: true,
         originalSlug: true,
         deletedAt: true,
         deletedBy: { select: AUTHOR_SELECT },
         translations: TAG_TRANSLATIONS_SELECT,
      } satisfies Prisma.TagSelect;

      let rows;
      let totalCount;
      if (query.sortBy === 'title') {
         [rows, totalCount] = await this.findPageByName(where, query, (pageWhere) =>
            this.prisma.tag.findMany({ where: pageWhere, select }),
         );
      } else {
         [rows, totalCount] = await this.prisma.$transaction([
            this.prisma.tag.findMany({
               where,
               select,
               ...buildPaginationArgs(query),
               orderBy: buildOrderBy(query, { deletedAt: 'deletedAt' }, 'deletedAt', 'desc'),
            }),
            this.prisma.tag.count({ where }),
         ]);
      }
      return {
         data: rows.map(({ translations, ...row }) =>
            toTrashedItem({ ...row, title: tagName({ translations }) }, retentionDays),
         ),
         totalCount,
      };
   }

   async removePermanently(id: number) {
      const removed = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await lockTag(tx, id, 'trashed');
               const tag = await tx.tag.findUniqueOrThrow({
                  where: { id, ...IN_TRASH },
                  select: { originalSlug: true, translations: TAG_TRANSLATIONS_SELECT },
               });
               await tx.projectTag.deleteMany({ where: { tagId: id } });
               await tx.tag.delete({ where: { id } });
               return { title: tagName(tag), originalSlug: tag.originalSlug };
            }),
         { referenceMissing: 'Not found' },
      );
      this.adminEvents.publish(EditLockEntity.tags, id, AdminEventAction.deleted, null);
      return removed;
   }

   async findExpiredTrashIds(cutoff: Date, limit: number, excludeIds: number[] = []) {
      const rows = await this.prisma.tag.findMany({
         where: { deletedAt: { lt: cutoff }, id: { notIn: excludeIds } },
         select: { id: true },
         orderBy: [{ deletedAt: 'asc' }, { id: 'asc' }],
         take: limit,
      });
      return rows.map((row) => row.id);
   }

   async findAllPublic(query: PaginationQueryDto) {
      const where = NOT_TRASHED;
      const include = {
         translations: TAG_TRANSLATIONS_SELECT,
         _count: {
            select: {
               projects: { where: { project: { ...NOT_TRASHED, status: EntityStatus.published } } },
            },
         },
      } satisfies Prisma.TagInclude;
      const omit = {
         createdById: true,
         version: true,
         deletedAt: true,
         deletedById: true,
         originalSlug: true,
      } satisfies Prisma.TagOmit;

      const [data, totalCount] =
         query.sortBy === 'name'
            ? await this.findPageByName(where, query, (pageWhere) =>
                 this.prisma.tag.findMany({ where: pageWhere, include, omit }),
              )
            : await this.prisma.$transaction([
                 this.prisma.tag.findMany({
                    where,
                    omit,
                    include,
                    ...buildPaginationArgs(query),
                    orderBy: buildOrderBy(query, { sortOrder: 'sortOrder' }, 'sortOrder'),
                 }),
                 this.prisma.tag.count({ where }),
              ]);
      return { data, totalCount };
   }
}
