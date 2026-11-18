import type { Queue } from 'bullmq';

import { FILE_THUMBNAIL_JOB_PROCESS } from '../file-thumbnail.constants';
import { FileThumbnailQueue } from '../file-thumbnail.queue';
import type { ProcessThumbnailJobData } from '../file-thumbnail.types';

describe('FileThumbnailQueue', () => {
   let queue: { add: jest.Mock };
   let producer: FileThumbnailQueue;

   beforeEach(() => {
      queue = { add: jest.fn().mockResolvedValue(undefined) };
      producer = new FileThumbnailQueue(queue as unknown as Queue<ProcessThumbnailJobData>);
   });

   it('enqueues a process job with deterministic jobId and retry policy', async () => {
      await producer.process(123);
      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(queue.add).toHaveBeenCalledWith(
         FILE_THUMBNAIL_JOB_PROCESS,
         { fileId: 123 },
         {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            jobId: 'file-thumbnail-123',
         },
      );
   });
});
