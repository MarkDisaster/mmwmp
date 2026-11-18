import { Injectable } from '@nestjs/common';

import { adminEntityPath, adminListPath } from '@/ai/admin-routes';
import { AUDIT_SAMPLE_SIZE } from '@/ai/tools/limits';
import { NOT_TRASHED } from '@/common/trash/trash';
import { FileService } from '@/file/file.service';
import { fileDisplayName } from '@/file/file-display-name';
import type { Prisma } from '@/generated/prisma/client';
import { EntityStatus, Language } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';

type AuditItem = {
   id: number;
   name: string;
   adminUrl: string;
   detail?: string;
};

type AuditCategory = { total: number; items: AuditItem[] };

const NO_META_TITLE: Prisma.ProjectTranslationWhereInput & Prisma.ServiceTranslationWhereInput = {
   OR: [{ metaTitle: null }, { metaTitle: '' }],
};
const NO_META_DESCRIPTION: Prisma.ProjectTranslationWhereInput &
   Prisma.ServiceTranslationWhereInput = {
   OR: [{ metaDescription: null }, { metaDescription: '' }],
};

const TRANSLATION_SELECT = {
   select: { language: true, metaTitle: true, metaDescription: true },
   orderBy: { language: 'asc' },
} as const satisfies Prisma.ProjectTranslationFindManyArgs;

type MetaRow = {
   translations: { language: string; metaTitle: string | null; metaDescription: string | null }[];
};

const missingMeta = (field: 'metaTitle' | 'metaDescription') => (row: MetaRow) =>
   row.translations
      .filter((t) => !t[field]?.trim())
      .map((t) => t.language)
      .join(', ');

const nameOf = (row: { title: string; slug: string }) => row.title.trim() || row.slug;

const sample = async <R>(
   total: Promise<number>,
   rows: Promise<R[]>,
   toItem: (row: R) => AuditItem,
): Promise<AuditCategory> => ({
   total: await total,
   items: (await rows).map(toItem),
});

@Injectable()
export class ContentAuditService {
   constructor(
      private readonly prisma: PrismaService,
      private readonly files: FileService,
   ) {}

   async auditProjects(draftCutoff: Date) {
      const check = (
         extra: Prisma.ProjectWhereInput,
         detail?: (row: MetaRow) => string,
      ): Promise<AuditCategory> =>
         sample(
            this.prisma.project.count({ where: { ...NOT_TRASHED, ...extra } }),
            this.prisma.project.findMany({
               where: { ...NOT_TRASHED, ...extra },
               select: { id: true, title: true, slug: true, translations: TRANSLATION_SELECT },
               orderBy: { id: 'asc' },
               take: AUDIT_SAMPLE_SIZE,
            }),
            (row) => ({
               id: row.id,
               name: nameOf(row),
               adminUrl: adminEntityPath('project', row.id),
               ...(detail ? { detail: detail(row) } : {}),
            }),
         );

      const [
         withoutEnTranslation,
         withoutMetaTitle,
         withoutMetaDescription,
         withoutThumbnail,
         withoutDescription,
         oldDrafts,
         publishedWithEmptyContent,
      ] = await Promise.all([
         check({ translations: { none: { language: Language.en } } }),
         check({ translations: { some: NO_META_TITLE } }, missingMeta('metaTitle')),
         check({ translations: { some: NO_META_DESCRIPTION } }, missingMeta('metaDescription')),
         check({ thumbnailId: null }),
         check({ translations: { none: { description: { not: '' } } } }),
         check({ status: EntityStatus.draft, createdAt: { lt: draftCutoff } }),
         check({
            status: EntityStatus.published,
            translations: { none: { content: { not: '' } } },
         }),
      ]);
      return {
         withoutEnTranslation,
         withoutMetaTitle,
         withoutMetaDescription,
         withoutThumbnail,
         withoutDescription,
         oldDrafts,
         publishedWithEmptyContent,
      };
   }

   async auditServices(draftCutoff: Date) {
      const check = (
         extra: Prisma.ServiceWhereInput,
         detail?: (row: MetaRow) => string,
      ): Promise<AuditCategory> =>
         sample(
            this.prisma.service.count({ where: { ...NOT_TRASHED, ...extra } }),
            this.prisma.service.findMany({
               where: { ...NOT_TRASHED, ...extra },
               select: { id: true, title: true, slug: true, translations: TRANSLATION_SELECT },
               orderBy: { id: 'asc' },
               take: AUDIT_SAMPLE_SIZE,
            }),
            (row) => ({
               id: row.id,
               name: nameOf(row),
               adminUrl: adminEntityPath('service', row.id),
               ...(detail ? { detail: detail(row) } : {}),
            }),
         );

      const [
         withoutEnTranslation,
         withoutMetaTitle,
         withoutMetaDescription,
         oldDrafts,
         publishedWithEmptyContent,
      ] = await Promise.all([
         check({ translations: { none: { language: Language.en } } }),
         check({ translations: { some: NO_META_TITLE } }, missingMeta('metaTitle')),
         check({ translations: { some: NO_META_DESCRIPTION } }, missingMeta('metaDescription')),
         check({ status: EntityStatus.draft, createdAt: { lt: draftCutoff } }),
         check({
            status: EntityStatus.published,
            translations: { none: { content: { not: '' } } },
         }),
      ]);
      return {
         withoutEnTranslation,
         withoutMetaTitle,
         withoutMetaDescription,
         oldDrafts,
         publishedWithEmptyContent,
      };
   }

   async auditFiles() {
      const fileItem = (row: { id: number; originalName: string; displayName: string | null }) => {
         const name = fileDisplayName(row);
         return { id: row.id, name, adminUrl: adminListPath('/files', name) };
      };
      const imagesWithoutAlt: Prisma.FileWhereInput = {
         mimeType: { startsWith: 'image/' },
         OR: [{ altText: null }, { altText: '' }],
      };
      const [imagesWithoutAltText, unused] = await Promise.all([
         sample(
            this.prisma.file.count({ where: { ...NOT_TRASHED, ...imagesWithoutAlt } }),
            this.prisma.file.findMany({
               where: { ...NOT_TRASHED, ...imagesWithoutAlt },
               select: { id: true, originalName: true, displayName: true },
               orderBy: { id: 'asc' },
               take: AUDIT_SAMPLE_SIZE,
            }),
            fileItem,
         ),
         this.files
            .findUnused(0, AUDIT_SAMPLE_SIZE)
            .then((result): AuditCategory & { totalSizeBytes: number } => ({
               total: result.totalCount,
               totalSizeBytes: result.totalSizeBytes,
               items: result.data.map(fileItem),
            })),
      ]);
      return { imagesWithoutAltText, unused };
   }
}
