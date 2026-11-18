import { Inject, Injectable, Logger } from '@nestjs/common';
import IORedis from 'ioredis';

import { REDIS_CLIENT } from '@/redis/redis.module';

@Injectable()
export class CacheService {
   private readonly logger = new Logger(CacheService.name);

   constructor(@Inject(REDIS_CLIENT) private readonly redis: IORedis) {}

   async get<T>(key: string): Promise<T | null> {
      try {
         const raw = await this.redis.get(key);
         return raw ? (JSON.parse(raw) as T) : null;
      } catch (err) {
         this.logger.warn(`Cache get failed for key "${key}"`, err);
         return null;
      }
   }

   async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      try {
         await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
         this.logger.warn(`Cache set failed for key "${key}"`, err);
      }
   }

   async del(...keys: string[]): Promise<void> {
      if (keys.length === 0) return;
      try {
         await this.redis.del(...keys);
      } catch (err) {
         this.logger.warn(`Cache del failed for ${keys.length} key(s)`, err);
      }
   }

   async delPattern(pattern: string): Promise<void> {
      const prefix = this.redis.options.keyPrefix ?? '';
      try {
         let cursor = '0';
         do {
            const [nextCursor, keys] = await this.redis.scan(
               cursor,
               'MATCH',
               `${prefix}${pattern}`,
               'COUNT',
               1000,
            );
            cursor = nextCursor;
            if (keys.length > 0) {
               await this.del(...keys.map((key) => key.slice(prefix.length)));
            }
         } while (cursor !== '0');
      } catch (err) {
         this.logger.warn(`Cache delPattern failed for pattern "${pattern}"`, err);
      }
   }
}
