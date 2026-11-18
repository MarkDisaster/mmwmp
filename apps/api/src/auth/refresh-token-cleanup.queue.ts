import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
   REFRESH_TOKEN_CLEANUP_JOB,
   REFRESH_TOKEN_CLEANUP_PATTERN,
   REFRESH_TOKEN_CLEANUP_QUEUE,
   REFRESH_TOKEN_CLEANUP_SCHEDULER,
} from './refresh-token-cleanup.constants';

@Injectable()
export class RefreshTokenCleanupQueue implements OnApplicationBootstrap {
   private readonly logger = new Logger(RefreshTokenCleanupQueue.name);

   constructor(@InjectQueue(REFRESH_TOKEN_CLEANUP_QUEUE) private readonly queue: Queue) {}

   async onApplicationBootstrap(): Promise<void> {
      try {
         await this.queue.upsertJobScheduler(
            REFRESH_TOKEN_CLEANUP_SCHEDULER,
            { pattern: REFRESH_TOKEN_CLEANUP_PATTERN, tz: 'UTC' },
            {
               name: REFRESH_TOKEN_CLEANUP_JOB,
               opts: { attempts: 3, backoff: { type: 'exponential', delay: 60_000 } },
            },
         );
      } catch (error) {
         this.logger.error(
            `Could not schedule the refresh token cleanup: ${(error as Error).message}`,
         );
      }
   }
}
