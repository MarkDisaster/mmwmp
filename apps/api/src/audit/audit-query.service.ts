import { Injectable } from '@nestjs/common';

import { AUTHOR_SELECT } from '@/common/author/author';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import type { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@Injectable()
export class AuditQueryService {
   constructor(private readonly prisma: PrismaService) {}

   latest(limit: number) {
      return this.prisma.auditLog.findMany({
         orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
         take: limit,
         include: {
            user: { select: { ...AUTHOR_SELECT, role: { select: { isAdmin: true } } } },
         },
      });
   }

   async list(query: ListAuditLogsDto) {
      const where: Prisma.AuditLogWhereInput = {};

      if (query.userId !== undefined) where.userId = query.userId;
      if (query.action) where.action = query.action;
      if (query.resourceType) where.resourceType = query.resourceType;
      if (query.actorType) where.actorType = query.actorType;

      if (query.from || query.to) {
         where.createdAt = {};
         if (query.from) where.createdAt.gte = new Date(query.from);
         if (query.to) {
            const toDate = new Date(query.to);
            toDate.setUTCHours(23, 59, 59, 999);
            where.createdAt.lte = toDate;
         }
      }

      const limit = query.limit;
      const skip = query.page * limit;

      const [data, totalCount] = await Promise.all([
         this.prisma.auditLog.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip,
            take: limit,
            include: {
               user: {
                  select: { ...AUTHOR_SELECT, role: { select: { isAdmin: true } } },
               },
            },
         }),
         this.prisma.auditLog.count({ where }),
      ]);

      return { data, totalCount };
   }
}
