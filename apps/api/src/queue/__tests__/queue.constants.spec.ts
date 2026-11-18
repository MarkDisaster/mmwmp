import { EmailProcessor } from '@/email/email.processor';
import { FileThumbnailProcessor } from '@/file/file-thumbnail.processor';
import { RunnerScoreCleanupProcessor } from '@/runner-score/runner-score-cleanup.processor';

import { IDLE_WORKER_OPTIONS } from '../queue.constants';

const WORKER_METADATA = 'bullmq:worker_metadata';

describe('worker idle-polling options', () => {
   it('keeps the intervals above the BullMQ defaults', () => {
      expect(IDLE_WORKER_OPTIONS.drainDelay).toBeGreaterThanOrEqual(60);
      expect(IDLE_WORKER_OPTIONS.stalledInterval).toBeGreaterThan(30_000);
   });

   it.each([
      ['EmailProcessor', EmailProcessor],
      ['FileThumbnailProcessor', FileThumbnailProcessor],
      ['RunnerScoreCleanupProcessor', RunnerScoreCleanupProcessor],
   ])('%s uses them', (_name, processor) => {
      expect(Reflect.getMetadata(WORKER_METADATA, processor)).toMatchObject(IDLE_WORKER_OPTIONS);
   });
});
