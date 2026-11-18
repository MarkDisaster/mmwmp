import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';

import {
   RUNNER_SCORE_CLEANUP_JOB,
   RUNNER_SCORE_CLEANUP_PATTERN,
   RUNNER_SCORE_CLEANUP_QUEUE,
   RUNNER_SCORE_CLEANUP_SCHEDULER,
} from './runner-score-cleanup.constants';

@Injectable()
export class RunnerScoreCleanupQueue implements OnApplicationBootstrap {
   private readonly logger = new Logger(RunnerScoreCleanupQueue.name);

   constructor(
      @InjectQueue(RUNNER_SCORE_CLEANUP_QUEUE) private readonly queue: Queue,
      private readonly config: ConfigService,
   ) {}

   async onApplicationBootstrap(): Promise<void> {
      try {
         if (!this.config.get<boolean>('app.runnerScoreCleanupEnabled', true)) {
            await this.queue.removeJobScheduler(RUNNER_SCORE_CLEANUP_SCHEDULER);
            this.logger.log(
               'Runner score cleanup is turned off (RUNNER_SCORE_CLEANUP_ENABLED=false)',
            );
            return;
         }
         await this.queue.upsertJobScheduler(
            RUNNER_SCORE_CLEANUP_SCHEDULER,
            { pattern: RUNNER_SCORE_CLEANUP_PATTERN, tz: 'UTC' },
            {
               name: RUNNER_SCORE_CLEANUP_JOB,
               opts: { attempts: 3, backoff: { type: 'exponential', delay: 60_000 } },
            },
         );
      } catch (error) {
         this.logger.error(
            `Could not schedule the runner score cleanup: ${(error as Error).message}`,
         );
      }
   }
}
