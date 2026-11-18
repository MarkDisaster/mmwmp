import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { CacheService } from '@/cache/cache.service';
import type { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { EntityStatus, SlugRedirectResource } from '@/generated/prisma/enums';
import { buildPaginationArgs, buildSearchWhere } from '@/prisma/pagination.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { RevalidationService } from '@/revalidation/revalidation.service';

type SlugRedirectTargetState = 'published' | 'draft' | 'trashed' | 'missing';

type Target = { title: string; slug: string; status: EntityStatus; deletedAt: Date | null };

const targetState = (target: Target | undefined): SlugRedirectTargetState => {
   if (!target) return 'missing';
   if (target.deletedAt) return 'trashed';
   return target.status === EntityStatus.published ? 'published' : 'draft';
};

@Injectable()
export class SlugRedirectService {
   constructor(
      private readonly prisma: PrismaService,
      private readonly revalidation: RevalidationService,
      private readonly cache: CacheService,
   ) {}

   async findAll(resource: SlugRedirectResource, query: PaginationQueryDto) {
      const where = { resource, ...buildSearchWhere(query.search, ['oldSlug']) };
      const [rows, totalCount] = await this.prisma.$transaction([
         this.prisma.slugRedirect.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            ...buildPaginationArgs(query),
         }),
         this.prisma.slugRedirect.count({ where }),
      ]);
      const targets = await this.findTargets(
         resource,
         rows.map((row) => row.targetId),
      );
      return {
         data: rows.map((row) => {
            const target = targets.get(row.targetId);
            return {
               id: row.id,
               oldSlug: row.oldSlug,
               targetId: row.targetId,
               targetTitle: target?.title ?? null,
               targetSlug: target && !target.deletedAt ? target.slug : null,
               targetState: targetState(target),
               createdAt: row.createdAt,
            };
         }),
         totalCount,
      };
   }

   async remove(resource: SlugRedirectResource, id: number, expectedOldSlug?: string) {
      const redirect = await this.prisma.slugRedirect.findFirst({ where: { id, resource } });
      if (!redirect) throw new NotFoundException('Slug redirect not found');
      if (expectedOldSlug !== undefined && redirect.oldSlug !== expectedOldSlug) {
         throw new ConflictException(
            `Slug redirect ${id} is "${redirect.oldSlug}", not "${expectedOldSlug}"`,
         );
      }

      const { count } = await this.prisma.slugRedirect.deleteMany({ where: { id, resource } });
      if (count === 0) throw new NotFoundException('Slug redirect not found');

      const prefix = resource === SlugRedirectResource.project ? 'projects' : 'services';
      await this.cache.delPattern(`${prefix}:*`);
      this.revalidation.revalidate(prefix);
      return { id: redirect.id, oldSlug: redirect.oldSlug, targetId: redirect.targetId };
   }

   private async findTargets(resource: SlugRedirectResource, ids: number[]) {
      if (ids.length === 0) return new Map<number, Target>();
      const select = { id: true, title: true, slug: true, status: true, deletedAt: true };
      // trash-ok: the state of the target (also a trashed one) is what the admin needs to see
      const rows =
         resource === SlugRedirectResource.project
            ? await this.prisma.project.findMany({ where: { id: { in: ids } }, select })
            : await this.prisma.service.findMany({ where: { id: { in: ids } }, select });
      return new Map(rows.map((row) => [row.id, row]));
   }
}
