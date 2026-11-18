import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AiModule } from './ai/ai.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { ChatModule } from './chat/chat.module';
import { AuthorPrivacyInterceptor } from './common/author/author-privacy.interceptor';
import { ClientIpThrottlerGuard } from './common/guards/client-ip-throttler.guard';
import appConfig from './config/env/app.config';
import { resolveAppEnv } from './config/env/app-env';
import authConfig from './config/env/auth.config';
import emailConfig from './config/env/email.config';
import redisConfig from './config/env/redis.config';
import storageConfig from './config/env/storage.config';
import { validateEnv } from './config/env/validate';
import { LOG_REDACT, LOG_SERIALIZERS } from './config/logger-redact';
import { ContactModule } from './contact/contact.module';
import { ContentInsightsModule } from './content-insights/content-insights.module';
import { EditLockModule } from './edit-lock/edit-lock.module';
import { EmailWorkerModule } from './email/email-worker.module';
import { FileModule } from './file/file.module';
import { HealthModule } from './health/health.module';
import { LinkCheckModule } from './link-check/link-check.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './project/project.module';
import { QueueModule } from './queue/queue.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { RedisThrottlerStorage } from './rate-limit/redis-throttler.storage';
import { GLOBAL_THROTTLE } from './rate-limit/throttle-limits';
import { RealtimeModule } from './realtime/realtime.module';
import { RedisModule } from './redis/redis.module';
import { RevalidationModule } from './revalidation/revalidation.module';
import { RoleModule } from './role/role.module';
import { RunnerScoreModule } from './runner-score/runner-score.module';
import { ServiceModule } from './service/service.module';
import { SlugRedirectModule } from './slug-redirect/slug-redirect.module';
import { TagModule } from './tag/tag.module';
import { TrashModule } from './trash/trash.module';
import { UserModule } from './user/user.module';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         load: [authConfig, redisConfig, storageConfig, emailConfig, appConfig],
         validate: validateEnv,
      }),
      LoggerModule.forRoot({
         pinoHttp: {
            redact: LOG_REDACT,
            serializers: LOG_SERIALIZERS,
            mixin: () => ({ env: resolveAppEnv() }),
            transport:
               process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
                  ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
                  : undefined,
            level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
         },
      }),
      ThrottlerModule.forRootAsync({
         imports: [RateLimitModule],
         inject: [RedisThrottlerStorage],
         useFactory: (storage: RedisThrottlerStorage) => ({
            throttlers: [GLOBAL_THROTTLE],
            storage,
         }),
      }),
      PrismaModule,
      RedisModule,
      CacheModule,
      QueueModule,
      HealthModule,
      AuthModule,
      RevalidationModule,
      RoleModule,
      UserModule,
      EmailWorkerModule,
      TagModule,
      ProjectModule,
      ServiceModule,
      FileModule,
      ContactModule,
      EditLockModule,
      RealtimeModule,
      AiModule,
      ChatModule,
      AuditModule,
      RunnerScoreModule,
      TrashModule,
      ContentInsightsModule,
      SlugRedirectModule,
      LinkCheckModule,
   ],
   providers: [
      {
         provide: APP_GUARD,
         useClass: ClientIpThrottlerGuard,
      },
      {
         provide: APP_INTERCEPTOR,
         useClass: AuditInterceptor,
      },
      {
         provide: APP_INTERCEPTOR,
         useClass: AuthorPrivacyInterceptor,
      },
   ],
})
export class AppModule {}
