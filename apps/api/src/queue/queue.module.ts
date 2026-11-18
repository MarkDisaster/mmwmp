import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { BullBoardAuthMiddleware } from './bull-board-auth.middleware';
import { WorkerShutdownService } from './worker-shutdown.service';

@Global()
@Module({
   imports: [
      BullModule.forRootAsync({
         imports: [ConfigModule],
         useFactory: (config: ConfigService) => {
            const prefix = config.get<string>('redis.bullPrefix');
            return {
               connection: {
                  url: config.getOrThrow<string>('redis.url'),
               },
               ...(prefix && { prefix }),
               defaultJobOptions: {
                  removeOnComplete: 100,
                  removeOnFail: 50,
               },
            };
         },
         inject: [ConfigService],
      }),
      BullBoardModule.forRootAsync({
         imports: [
            JwtModule.registerAsync({
               imports: [ConfigModule],
               useFactory: (config: ConfigService) => ({
                  secret: config.getOrThrow<string>('auth.jwtSecret'),
               }),
               inject: [ConfigService],
            }),
         ],
         useFactory: () => ({
            route: '/queues',
            adapter: ExpressAdapter,
            middleware: BullBoardAuthMiddleware,
         }),
      }),
      DiscoveryModule,
   ],
   providers: [WorkerShutdownService],
   exports: [BullModule],
})
export class QueueModule {}
