import { Injectable } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

type UsageWindow = { from?: string; to?: string; userId?: number };

@Injectable()
export class AiUsageService {
   constructor(private readonly prisma: PrismaService) {}

   async summary(q: UsageWindow) {
      const where = this.buildWhere(q);

      const [agg, errorCount] = await this.prisma.$transaction([
         this.prisma.aiInteraction.aggregate({
            where,
            _count: { _all: true },
            _sum: { totalTokens: true },
            _avg: { latencyMs: true },
         }),
         this.prisma.aiInteraction.count({ where: { ...where, error: { not: null } } }),
      ]);

      return {
         interactionCount: agg._count._all,
         totalTokens: agg._sum.totalTokens ?? 0,
         avgLatencyMs: agg._avg.latencyMs === null ? null : Math.round(agg._avg.latencyMs),
         errorCount,
      };
   }

   async interactions(q: UsageWindow & { page?: number; limit?: number }) {
      const page = q.page ?? 1;
      const limit = q.limit ?? 50;
      const where = this.buildWhere(q);

      const [items, total] = await this.prisma.$transaction([
         this.prisma.aiInteraction.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * limit,
            take: limit,
         }),
         this.prisma.aiInteraction.count({ where }),
      ]);

      return { items, page, limit, total };
   }

   private buildWhere({ from, to, userId }: UsageWindow): Prisma.AiInteractionWhereInput {
      return {
         ...(from || to
            ? {
                 createdAt: {
                    ...(from ? { gte: new Date(from) } : {}),
                    ...(to ? { lt: new Date(to) } : {}),
                 },
              }
            : {}),
         ...(userId !== undefined ? { userId } : {}),
      };
   }
}
