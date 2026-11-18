import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { RefreshTokenCleanupQueue } from '../refresh-token-cleanup.queue';

describe('RefreshTokenCleanupQueue', () => {
   const queue = { upsertJobScheduler: jest.fn() };

   beforeEach(() => {
      queue.upsertJobScheduler.mockReset().mockResolvedValue({});
   });

   it('upserts one daily scheduler under a fixed id, so every instance shares it', async () => {
      await new RefreshTokenCleanupQueue(queue as unknown as Queue).onApplicationBootstrap();

      expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
         'refresh-token-cleanup-daily',
         { pattern: '45 4 * * *', tz: 'UTC' },
         expect.objectContaining({ name: 'cleanup' }),
      );
   });

   it('logs a failed registration instead of failing the start', async () => {
      queue.upsertJobScheduler.mockRejectedValue(new Error('Redis down'));
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await expect(
         new RefreshTokenCleanupQueue(queue as unknown as Queue).onApplicationBootstrap(),
      ).resolves.toBeUndefined();

      expect(error).toHaveBeenCalledWith(expect.stringContaining('Redis down'));
      error.mockRestore();
   });
});
