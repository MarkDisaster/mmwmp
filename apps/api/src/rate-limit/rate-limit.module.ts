import { Module } from '@nestjs/common';

import { RedisModule } from '@/redis/redis.module';

import { RateLimitService } from './rate-limit.service';
import { RedisThrottlerStorage } from './redis-throttler.storage';

@Module({
   imports: [RedisModule],
   providers: [RateLimitService, RedisThrottlerStorage],
   exports: [RateLimitService, RedisThrottlerStorage],
})
export class RateLimitModule {}
