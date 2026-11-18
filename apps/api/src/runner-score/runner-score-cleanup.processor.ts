import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';

import { ReportingWorkerHost } from '@/common/sentry/reporting-worker-host';
import { IDLE_WORKER_OPTIONS } from '@/queue/queue.constants';

import {
   RUNNER_SCORE_CLEANUP_JOB,
   RUNNER_SCORE_CLEANUP_QUEUE,
} from './runner-score-cleanup.constants';
import { type CleanupResult, RunnerScoreCleanupService } from './runner-score-cleanup.service';

@Processor(RUNNER_SCORE_CLEANUP_QUEUE, IDLE_WORKER_OPTIONS)
export class RunnerScoreCleanupProcessor extends ReportingWorkerHost {
   private readonly logger = new Logger(RunnerScoreCleanupProcessor.name);

   constructor(
      private readonly cleanup: RunnerScoreCleanupService,
      private readonly config: ConfigService,
   ) {
      super();
   }

   async process(job: Job): Promise<CleanupResult | null> {
      if (job.name !== RUNNER_SCORE_CLEANUP_JOB) {
         this.logger.warn(`Unknown runner score job "${job.name}" (id=${job.id}) — skipping`);
         return null;
      }
      if (!this.config.get<boolean>('app.runnerScoreCleanupEnabled', true)) {
         this.logger.log('Runner score cleanup is turned off (RUNNER_SCORE_CLEANUP_ENABLED=false)');
         return null;
      }
      return this.cleanup.deleteStaleScores();
   }
}
