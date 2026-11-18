import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';

import {
   TRASH_PURGE_JOB,
   TRASH_PURGE_PATTERN,
   TRASH_PURGE_QUEUE,
   TRASH_PURGE_SCHEDULER,
} from './trash-purge.constants';

@Injectable()
export class TrashPurgeQueue implements OnApplicationBootstrap {
   private readonly logger = new Logger(TrashPurgeQueue.name);

   constructor(
      @InjectQueue(TRASH_PURGE_QUEUE) private readonly queue: Queue,
      private readonly config: ConfigService,
   ) {}

   async onApplicationBootstrap(): Promise<void> {
      try {
         if (!this.config.get<boolean>('app.trashPurgeEnabled', true)) {
            await this.queue.removeJobScheduler(TRASH_PURGE_SCHEDULER);
            this.logger.log('Trash purge is turned off (TRASH_PURGE_ENABLED=false)');
            return;
         }
         await this.queue.upsertJobScheduler(
            TRASH_PURGE_SCHEDULER,
            { pattern: TRASH_PURGE_PATTERN, tz: 'UTC' },
            {
               name: TRASH_PURGE_JOB,
               opts: { attempts: 3, backoff: { type: 'exponential', delay: 60_000 } },
            },
         );
      } catch (error) {
         this.logger.error(`Could not schedule the trash purge: ${(error as Error).message}`);
      }
   }
}
