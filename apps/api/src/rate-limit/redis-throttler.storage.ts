import type { OnApplicationShutdown } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageService } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '@/redis/redis.module';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

const INCREMENT_SCRIPT = `
local blockTtl = redis.call('PTTL', KEYS[2])
if blockTtl > 0 then
   return {tonumber(redis.call('GET', KEYS[1]) or '0'), redis.call('PTTL', KEYS[1]), 1, blockTtl}
end
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if hits > tonumber(ARGV[2]) then
   redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
   redis.call('PEXPIRE', KEYS[1], ARGV[3])
   return {hits, tonumber(ARGV[3]), 1, tonumber(ARGV[3])}
end
return {hits, ttl, 0, 0}
`;

const REDIS_TIMEOUT_MS = 500;

const toSeconds = (ms: number) => Math.max(0, Math.ceil(ms / 1000));

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
   let timer: NodeJS.Timeout | undefined;
   const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`No answer within ${ms} ms`)), ms);
   });
   return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

type RedisWithThrottlerScript = Redis & {
   throttlerIncrement(...args: (string | number)[]): Promise<[number, number, number, number]>;
};

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
   private readonly logger = new Logger(RedisThrottlerStorage.name);
   private readonly fallback = new ThrottlerStorageService();

   private readonly redis: RedisWithThrottlerScript;

   constructor(@Inject(REDIS_CLIENT) redis: Redis) {
      redis.defineCommand('throttlerIncrement', { numberOfKeys: 2, lua: INCREMENT_SCRIPT });
      this.redis = redis as RedisWithThrottlerScript;
   }

   async increment(
      key: string,
      ttl: number,
      limit: number,
      blockDuration: number,
      throttlerName: string,
   ): Promise<ThrottlerStorageRecord> {
      try {
         const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = await withTimeout(
            this.redis.throttlerIncrement(
               `throttler:${throttlerName}:${key}`,
               `throttler:${throttlerName}:${key}:blocked`,
               ttl,
               limit,
               blockDuration,
            ),
            REDIS_TIMEOUT_MS,
         );
         return {
            totalHits,
            timeToExpire: toSeconds(timeToExpire),
            isBlocked: isBlocked === 1,
            timeToBlockExpire: toSeconds(timeToBlockExpire),
         };
      } catch (err) {
         this.logger.error(`Throttler storage in Redis failed: ${(err as Error).message}`);
         return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
      }
   }

   onApplicationShutdown(): void {
      this.fallback.onApplicationShutdown();
   }
}
