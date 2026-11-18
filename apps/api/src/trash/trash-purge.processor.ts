import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';

import { ReportingWorkerHost } from '@/common/sentry/reporting-worker-host';
import { IDLE_WORKER_OPTIONS } from '@/queue/queue.constants';

import { TRASH_PURGE_JOB, TRASH_PURGE_QUEUE } from './trash-purge.constants';
import { type PurgeResult, TrashPurgeService } from './trash-purge.service';

@Processor(TRASH_PURGE_QUEUE, IDLE_WORKER_OPTIONS)
export class TrashPurgeProcessor extends ReportingWorkerHost {
   private readonly logger = new Logger(TrashPurgeProcessor.name);

   constructor(
      private readonly purge: TrashPurgeService,
      private readonly config: ConfigService,
   ) {
      super();
   }

   async process(job: Job): Promise<PurgeResult | null> {
      if (job.name !== TRASH_PURGE_JOB) {
         this.logger.warn(`Unknown trash job "${job.name}" (id=${job.id}) — skipping`);
         return null;
      }
      if (!this.config.get<boolean>('app.trashPurgeEnabled', true)) {
         this.logger.log('Trash purge is turned off (TRASH_PURGE_ENABLED=false)');
         return null;
      }
      return this.purge.purgeExpired();
   }
}
