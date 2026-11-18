import { Injectable } from '@nestjs/common';

import { NOT_TRASHED } from '@/common/trash/trash';
import { EntityStatus, FileProcessingStatus, Language } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';

const countsOf = <K extends string>(
   keys: readonly K[],
   groups: { key: K | null; count: number }[],
): Record<K, number> =>
   Object.fromEntries(
      keys.map((key) => [key, groups.find((group) => group.key === key)?.count ?? 0]),
   ) as Record<K, number>;

const STATUSES = Object.values(EntityStatus);
const LANGUAGES = Object.values(Language);

@Injectable()
export class ContentStatsService {
   constructor(private readonly prisma: PrismaService) {}

   async projects() {
      const [byStatus, ...byLanguage] = await Promise.all([
         this.prisma.project.groupBy({
            by: ['status'],
            where: NOT_TRASHED,
            _count: { _all: true },
         }),
         ...LANGUAGES.map((language) =>
            this.prisma.project.count({
               where: { ...NOT_TRASHED, translations: { some: { language } } },
            }),
         ),
      ]);
      return this.entityStats(
         byStatus.map((g) => ({ key: g.status, count: g._count._all })),
         byLanguage,
      );
   }

   async services() {
      const [byStatus, ...byLanguage] = await Promise.all([
         this.prisma.service.groupBy({
            by: ['status'],
            where: NOT_TRASHED,
            _count: { _all: true },
         }),
         ...LANGUAGES.map((language) =>
            this.prisma.service.count({
               where: { ...NOT_TRASHED, translations: { some: { language } } },
            }),
         ),
      ]);
      return this.entityStats(
         byStatus.map((g) => ({ key: g.status, count: g._count._all })),
         byLanguage,
      );
   }

   async tags() {
      return { total: await this.prisma.tag.count({ where: NOT_TRASHED }) };
   }

   async users() {
      const live = { deletedAt: null };
      const [total, deactivated, pendingInvitation] = await Promise.all([
         this.prisma.user.count({ where: live }),
         this.prisma.user.count({ where: { ...live, deactivatedAt: { not: null } } }),
         this.prisma.user.count({
            where: {
               ...live,
               deactivatedAt: null,
               acceptedInvitationAt: null,
               invitedAt: { not: null },
            },
         }),
      ]);
      return {
         total,
         active: total - deactivated - pendingInvitation,
         deactivated,
         pendingInvitation,
      };
   }

   async files() {
      const [byProcessing, byLanguage, sum] = await Promise.all([
         this.prisma.file.groupBy({
            by: ['processingStatus'],
            where: NOT_TRASHED,
            _count: { _all: true },
         }),
         this.prisma.file.groupBy({
            by: ['language'],
            where: NOT_TRASHED,
            _count: { _all: true },
         }),
         this.prisma.file.aggregate({
            where: NOT_TRASHED,
            _sum: { size: true },
            _count: { _all: true },
         }),
      ]);
      return {
         total: sum._count._all,
         totalSizeBytes: sum._sum.size ?? 0,
         byProcessingStatus: countsOf(
            Object.values(FileProcessingStatus),
            byProcessing.map((g) => ({ key: g.processingStatus, count: g._count._all })),
         ),
         byLanguage: {
            ...countsOf(
               LANGUAGES,
               byLanguage.map((g) => ({ key: g.language, count: g._count._all })),
            ),
            none: byLanguage.find((g) => g.language === null)?._count._all ?? 0,
         },
      };
   }

   private entityStats(byStatus: { key: EntityStatus; count: number }[], byLanguage: number[]) {
      const counts = countsOf(STATUSES, byStatus);
      return {
         total: counts.draft + counts.published,
         byStatus: counts,
         byLanguage: Object.fromEntries(LANGUAGES.map((language, i) => [language, byLanguage[i]])),
      };
   }
}
