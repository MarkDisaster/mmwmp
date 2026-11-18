import { Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { RateLimitService } from '../rate-limit.service';

type ExecResult = [Error | null, unknown][] | null;

const redisAnswering = (exec: () => Promise<ExecResult>) => {
   const transaction = {
      incr: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      ttl: jest.fn().mockReturnThis(),
      exec: jest.fn(exec),
   };
   return { redis: { multi: jest.fn(() => transaction) } as unknown as Redis, transaction };
};

describe('RateLimitService', () => {
   let error: jest.SpyInstance;

   beforeEach(() => {
      error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
   });

   afterEach(() => error.mockRestore());

   it('counts in one MULTI transaction and sets the window only on the first hit', async () => {
      const { redis, transaction } = redisAnswering(() =>
         Promise.resolve([
            [null, 3],
            [null, 0],
            [null, 42],
         ]),
      );

      const result = await new RateLimitService(redis).hit('k', 5, 60);

      expect(transaction.expire).toHaveBeenCalledWith('k', 60, 'NX');
      expect(result).toEqual({
         allowed: true,
         count: 3,
         retryAfterSeconds: 42,
         unavailable: false,
      });
   });

   it('refuses a hit over the limit', async () => {
      const { redis } = redisAnswering(() =>
         Promise.resolve([
            [null, 6],
            [null, 0],
            [null, 10],
         ]),
      );

      expect((await new RateLimitService(redis).hit('k', 5, 60)).allowed).toBe(false);
   });

   it.each([
      ['the connection fails', () => Promise.reject(new Error('Connection is closed.'))],
      [
         'a command fails',
         () =>
            Promise.resolve([
               [new Error('OOM'), null],
               [null, 1],
               [null, 1],
            ]),
      ],
      ['the transaction is aborted', () => Promise.resolve(null)],
   ] as [string, () => Promise<ExecResult>][])(
      'allows and logs an error when %s',
      async (_case, exec) => {
         const result = await new RateLimitService(redisAnswering(exec).redis).hit('k', 5, 60);

         expect(result).toMatchObject({ allowed: true, unavailable: true });
         expect(error).toHaveBeenCalledTimes(1);
      },
   );

   it('refuses while Redis does not answer when the limit fails closed', async () => {
      const { redis } = redisAnswering(() => Promise.reject(new Error('Connection is closed.')));

      const result = await new RateLimitService(redis).hit('k', 5, 60, { failClosed: true });

      expect(result).toMatchObject({ allowed: false, unavailable: true });
   });

   it('logs the kind of limit without the address or the email of the key', async () => {
      const { redis } = redisAnswering(() => Promise.reject(new Error('Connection is closed.')));

      await new RateLimitService(redis).hit('auth:login:198.51.100.1|user@example.com', 5, 60);

      const [message] = error.mock.calls[0] as [string];
      expect(message).toContain('"auth:login"');
      expect(message).not.toMatch(/198\.51|user@example/);
   });

   describe('peek', () => {
      it('reads the count without counting and allows below the limit', async () => {
         const { redis, transaction } = redisAnswering(() =>
            Promise.resolve([
               [null, '4'],
               [null, 120],
            ]),
         );

         const result = await new RateLimitService(redis).peek('k', 5);

         expect(transaction.incr).not.toHaveBeenCalled();
         expect(result).toEqual({
            allowed: true,
            count: 4,
            retryAfterSeconds: 120,
            unavailable: false,
         });
      });

      it('refuses at the limit and treats a missing key as zero', async () => {
         const atLimit = redisAnswering(() =>
            Promise.resolve([
               [null, '5'],
               [null, 120],
            ]),
         );
         const missing = redisAnswering(() =>
            Promise.resolve([
               [null, null],
               [null, -2],
            ]),
         );

         expect((await new RateLimitService(atLimit.redis).peek('k', 5)).allowed).toBe(false);
         expect(await new RateLimitService(missing.redis).peek('k', 5)).toMatchObject({
            allowed: true,
            count: 0,
         });
      });

      it('refuses while Redis does not answer when the limit fails closed', async () => {
         const { redis } = redisAnswering(() => Promise.reject(new Error('Connection is closed.')));

         expect(await new RateLimitService(redis).peek('k', 5, { failClosed: true })).toMatchObject(
            {
               allowed: false,
               unavailable: true,
            },
         );
      });
   });
});
