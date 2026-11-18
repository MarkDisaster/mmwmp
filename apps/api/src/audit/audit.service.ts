import { Injectable, Logger } from '@nestjs/common';

import type { Prisma } from '@/generated/prisma/client';
import type { AuditActorType } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';

export type AuditLogInput = {
   userId?: number | null;
   actorType: AuditActorType;
   action: string;
   resourceType: string;
   resourceId?: string | number | null;
   metadata?: Prisma.InputJsonValue | null;
   ipAddress?: string | null;
   userAgent?: string | null;
   conversationId?: string | null;
};

@Injectable()
export class AuditService {
   private readonly logger = new Logger(AuditService.name);

   constructor(private readonly prisma: PrismaService) {}

   async log(input: AuditLogInput): Promise<void> {
      try {
         await this.prisma.auditLog.create({
            data: {
               userId: input.userId ?? null,
               actorType: input.actorType,
               action: input.action,
               resourceType: input.resourceType,
               resourceId: input.resourceId != null ? String(input.resourceId) : null,
               metadata: input.metadata ?? undefined,
               ipAddress: input.ipAddress ?? null,
               userAgent: input.userAgent ?? null,
               conversationId: input.conversationId ?? null,
            },
         });
      } catch (error) {
         this.logger.warn(
            `Failed to write audit log (${input.action} / ${input.resourceType}): ${
               (error as Error).message
            }`,
         );
      }
   }
}
