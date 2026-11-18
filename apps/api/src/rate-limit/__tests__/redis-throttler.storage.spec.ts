import { Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { RedisThrottlerStorage } from '../redis-throttler.storage';

const storageAnswering = (script: jest.Mock) =>
   new RedisThrottlerStorage({
      defineCommand: jest.fn(function (this: Record<string, unknown>, name: string) {
         this[name] = script;
      }),
   } as unknown as Redis);

describe('RedisThrottlerStorage', () => {
   let error: jest.SpyInstance;

   beforeEach(() => {
      error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
   });

   afterEach(() => error.mockRestore());

   it('returns the counts of the script in seconds', async () => {
      const script = jest.fn().mockResolvedValue([61, 1500, 1, 59_001]);
      const storage = storageAnswering(script);

      const record = await storage.increment('tracker', 60_000, 60, 60_000, 'default');

      expect(script).toHaveBeenCalledWith(
         'throttler:default:tracker',
         'throttler:default:tracker:blocked',
         60_000,
         60,
         60_000,
      );
      expect(record).toEqual({
         totalHits: 61,
         timeToExpire: 2,
         isBlocked: true,
         timeToBlockExpire: 60,
      });
   });

   it('keeps counting in memory while Redis fails', async () => {
      const storage = storageAnswering(
         jest.fn().mockRejectedValue(new Error('Connection is closed.')),
      );

      await storage.increment('tracker', 60_000, 1, 60_000, 'default');
      const record = await storage.increment('tracker', 60_000, 1, 60_000, 'default');
      storage.onApplicationShutdown();

      expect(record).toMatchObject({ totalHits: 2, isBlocked: true });
      expect(error).toHaveBeenCalledTimes(2);
   });

   it('counts in memory when Redis does not answer within the timeout', async () => {
      const storage = storageAnswering(jest.fn(() => new Promise(() => undefined)));

      const startedAt = Date.now();
      const record = await storage.increment('tracker', 60_000, 10, 60_000, 'default');
      storage.onApplicationShutdown();

      expect(record).toMatchObject({ totalHits: 1, isBlocked: false });
      expect(Date.now() - startedAt).toBeLessThan(2_000);
      expect(error).toHaveBeenCalledTimes(1);
   });
});
