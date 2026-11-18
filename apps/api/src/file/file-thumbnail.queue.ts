import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { FILE_THUMBNAIL_JOB_PROCESS, FILE_THUMBNAIL_QUEUE } from './file-thumbnail.constants';
import type { ProcessThumbnailJobData } from './file-thumbnail.types';

@Injectable()
export class FileThumbnailQueue {
   constructor(
      @InjectQueue(FILE_THUMBNAIL_QUEUE)
      private readonly queue: Queue<ProcessThumbnailJobData>,
   ) {}

   async process(fileId: number): Promise<void> {
      await this.queue.add(
         FILE_THUMBNAIL_JOB_PROCESS,
         { fileId },
         {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            jobId: `file-thumbnail-${fileId}`,
         },
      );
   }
}
