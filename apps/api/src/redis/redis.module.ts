import { Global, Inject, Injectable, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const logger = new Logger('Redis');

@Injectable()
class RedisLifecycle implements OnApplicationShutdown {
   private readonly logger = new Logger(RedisLifecycle.name);

   constructor(@Inject(REDIS_CLIENT) private readonly redis: IORedis) {}

   async onApplicationShutdown(): Promise<void> {
      try {
         await this.redis.quit();
      } catch (err) {
         this.logger.warn(`Redis quit failed: ${(err as Error).message}`);
      }
   }
}

@Global()
@Module({
   imports: [ConfigModule],
   providers: [
      {
         provide: REDIS_CLIENT,
         useFactory: (config: ConfigService): IORedis => {
            const client = new IORedis(config.getOrThrow<string>('redis.url'), {
               maxRetriesPerRequest: 3,
               commandTimeout: config.getOrThrow<number>('redis.commandTimeout'),
               keyPrefix: config.get<string>('redis.keyPrefix') || undefined,
            });
            client.on('error', (err: Error) => logger.warn(`Redis error: ${err.message}`));
            return client;
         },
         inject: [ConfigService],
      },
      RedisLifecycle,
   ],
   exports: [REDIS_CLIENT],
})
export class RedisModule {}
