import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { getOptionsToken } from '@nestjs/throttler';
import type IORedis from 'ioredis';
import type { Agent } from 'supertest';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { useJsonBodyLimit } from '../../src/config/body-parser';
import { RedisThrottlerStorage } from '../../src/rate-limit/redis-throttler.storage';
import { REDIS_CLIENT } from '../../src/redis/redis.module';
import { StorageService } from '../../src/storage/storage.service';
import { StorageTestService } from '../../src/storage/storage.test-service';

let app: NestExpressApplication;

export const getApp = () => app;
export const getHttpServer = (): Agent => request(app.getHttpServer()) as Agent;

beforeAll(async () => {
   const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
   })
      .overrideProvider(StorageService)
      .useClass(StorageTestService)
      .overrideProvider(getOptionsToken())
      .useFactory({
         factory: (storage: RedisThrottlerStorage) => ({
            throttlers: [{ ttl: 60_000, limit: 10_000 }],
            storage,
         }),
         inject: [RedisThrottlerStorage],
      })
      .compile();

   app = moduleFixture.createNestApplication<NestExpressApplication>();
   app.set('trust proxy', 1);
   useJsonBodyLimit(app);
   app.set('trust proxy', 1);
   app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
   await app.listen(0, '127.0.0.1');
});

beforeEach(async () => {
   await app.get<IORedis>(REDIS_CLIENT).flushdb();
});

afterAll(async () => {
   await app?.close();
});
