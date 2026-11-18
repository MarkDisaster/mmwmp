import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { ReportingWorkerHost } from '@/common/sentry/reporting-worker-host';
import { PrismaService } from '@/prisma/prisma.service';
import { IDLE_WORKER_OPTIONS } from '@/queue/queue.constants';

import {
   REFRESH_TOKEN_CLEANUP_JOB,
   REFRESH_TOKEN_CLEANUP_QUEUE,
} from './refresh-token-cleanup.constants';

@Processor(REFRESH_TOKEN_CLEANUP_QUEUE, IDLE_WORKER_OPTIONS)
export class RefreshTokenCleanupProcessor extends ReportingWorkerHost {
   private readonly logger = new Logger(RefreshTokenCleanupProcessor.name);

   constructor(private readonly prisma: PrismaService) {
      super();
   }

   async process(job: Job): Promise<{ deleted: number } | null> {
      if (job.name !== REFRESH_TOKEN_CLEANUP_JOB) {
         this.logger.warn(`Unknown refresh token job "${job.name}" (id=${job.id}) — skipping`);
         return null;
      }
      const { count } = await this.prisma.refreshToken.deleteMany({
         where: { expiresAt: { lt: new Date() } },
      });
      return { deleted: count };
   }
}
