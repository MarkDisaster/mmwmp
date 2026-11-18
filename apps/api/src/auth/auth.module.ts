import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { EmailModule } from '@/email/email.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RateLimitModule } from '@/rate-limit/rate-limit.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { REFRESH_TOKEN_CLEANUP_QUEUE } from './refresh-token-cleanup.constants';
import { RefreshTokenCleanupProcessor } from './refresh-token-cleanup.processor';
import { RefreshTokenCleanupQueue } from './refresh-token-cleanup.queue';

@Module({
   imports: [
      JwtModule.registerAsync({
         imports: [ConfigModule],
         useFactory: (config: ConfigService) => ({
            secret: config.getOrThrow<string>('auth.jwtSecret'),
            signOptions: {
               expiresIn: config.getOrThrow<number>('auth.jwtExpiration'),
            },
         }),
         inject: [ConfigService],
      }),
      PrismaModule,
      EmailModule,
      RateLimitModule,
      BullModule.registerQueue({ name: REFRESH_TOKEN_CLEANUP_QUEUE }),
      BullBoardModule.forFeature({ name: REFRESH_TOKEN_CLEANUP_QUEUE, adapter: BullMQAdapter }),
   ],
   controllers: [AuthController],
   providers: [AuthService, RefreshTokenCleanupQueue, RefreshTokenCleanupProcessor],
   exports: [AuthService, JwtModule],
})
export class AuthModule {}
