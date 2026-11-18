import type { Server } from 'node:http';

import { BullModule, getQueueToken, Processor, WorkerHost } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import type IORedis from 'ioredis';

import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../../../src/redis/redis.module';
import { StorageService } from '../../../src/storage/storage.service';
import { StorageTestService } from '../../../src/storage/storage.test-service';

const QUEUE = 'shutdown-test';
const events: string[] = [];
let markStarted: () => void = () => undefined;
const jobStarted = new Promise<void>((resolve) => {
   markStarted = resolve;
});

@Processor(QUEUE)
class SlowJobProcessor extends WorkerHost {
   constructor(private readonly prisma: PrismaService) {
      super();
   }

   async process(): Promise<void> {
      markStarted();
      await new Promise((resolve) => setTimeout(resolve, 300));
      await this.prisma.$queryRaw`SELECT 1`;
      events.push('job done');
   }
}

@Module({
   imports: [BullModule.registerQueue({ name: QUEUE })],
   providers: [SlowJobProcessor],
})
class SlowJobModule {}

describe('Shutdown order (SIGTERM on every deploy)', () => {
   it('closes the database pool and Redis only after the running job and the HTTP server', async () => {
      const moduleRef = await Test.createTestingModule({ imports: [AppModule, SlowJobModule] })
         .overrideProvider(StorageService)
         .useClass(StorageTestService)
         .compile();
      const app = moduleRef.createNestApplication<NestExpressApplication>();
      await app.listen(0, '127.0.0.1');

      const record = <T extends object>(target: T, method: keyof T, event: string) => {
         const original = (target[method] as (...args: unknown[]) => unknown).bind(target);
         jest.spyOn(target, method as never).mockImplementation(((...args: unknown[]) => {
            events.push(event);
            return original(...args);
         }) as never);
      };
      record(app.get(PrismaService), '$disconnect', 'database closed');
      record(app.get<IORedis>(REDIS_CLIENT), 'quit', 'redis closed');
      (app.getHttpServer() as Server).on('close', () => events.push('http closed'));

      await app.get<Queue>(getQueueToken(QUEUE)).add('slow', {});
      await jobStarted;
      await app.close();

      expect(events.slice(0, 2)).toEqual(['job done', 'http closed']);
      expect(events.slice(2).sort()).toEqual(['database closed', 'redis closed']);
   });
});
