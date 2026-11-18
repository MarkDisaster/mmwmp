import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ChainableCommander } from 'ioredis';
import { Redis } from 'ioredis';

import { REDIS_CLIENT } from '@/redis/redis.module';

export type RateLimitResult = {
   allowed: boolean;
   count: number;
   retryAfterSeconds: number;
   unavailable: boolean;
};

export type RateLimitOptions = {
   failClosed?: boolean;
};

const namespace = (key: string) => key.split(':').slice(0, 2).join(':');

@Injectable()
export class RateLimitService {
   private readonly logger = new Logger(RateLimitService.name);

   constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

   async hit(
      key: string,
      limit: number,
      windowSeconds: number,
      { failClosed = false }: RateLimitOptions = {},
   ): Promise<RateLimitResult> {
      try {
         const [count, , ttl] = (await this.exec(
            this.redis.multi().incr(key).expire(key, windowSeconds, 'NX').ttl(key),
         )) as [number, number, number];
         return {
            allowed: count <= limit,
            count,
            retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
            unavailable: false,
         };
      } catch (err) {
         return this.unavailable('hit', key, err, failClosed);
      }
   }

   async peek(
      key: string,
      limit: number,
      { failClosed = false }: RateLimitOptions = {},
   ): Promise<RateLimitResult> {
      try {
         const [value, ttl] = (await this.exec(this.redis.multi().get(key).ttl(key))) as [
            string | null,
            number,
         ];
         const count = Number(value ?? 0);
         return {
            allowed: count < limit,
            count,
            retryAfterSeconds: Math.max(ttl, 0),
            unavailable: false,
         };
      } catch (err) {
         return this.unavailable('peek', key, err, failClosed);
      }
   }

   async reset(...keys: string[]): Promise<void> {
      try {
         await this.redis.del(...keys);
      } catch (err) {
         this.logger.warn(
            `Rate limit reset failed for "${keys.map(namespace).join(', ')}": ${(err as Error).message}`,
         );
      }
   }

   private async exec(transaction: ChainableCommander): Promise<unknown[]> {
      const results = await transaction.exec();
      if (!results) throw new Error('Transaction aborted');
      const failed = results.find(([err]) => err);
      if (failed?.[0]) throw failed[0];
      return results.map(([, value]) => value);
   }

   private unavailable(
      operation: string,
      key: string,
      err: unknown,
      failClosed: boolean,
   ): RateLimitResult {
      this.logger.error(
         `Rate limit ${operation} failed for "${namespace(key)}": ${(err as Error).message}`,
      );
      return { allowed: !failClosed, count: 0, retryAfterSeconds: 0, unavailable: true };
   }
}
