import './instrument';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { noIndexMiddleware } from './common/noindex.middleware';
import { useJsonBodyLimit } from './config/body-parser';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
   const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

   app.useLogger(app.get(Logger));

   app.set('trust proxy', 1);

   app.enableShutdownHooks();

   useJsonBodyLimit(app);

   app.use(noIndexMiddleware);

   const configService = app.get(ConfigService);
   const allowedOrigins = configService.getOrThrow<string[]>('app.corsOrigins');
   const allowLocalhost = configService.getOrThrow<string>('app.nodeEnv') !== 'production';
   app.enableCors({
      origin: (
         origin: string | undefined,
         callback: (err: Error | null, allow?: boolean) => void,
      ) => {
         if (
            !origin ||
            (allowLocalhost && origin.startsWith('http://localhost:')) ||
            allowedOrigins.includes(origin)
         ) {
            callback(null, true);
         } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
         }
      },
      credentials: true,
   });

   app.useGlobalFilters(new GlobalExceptionFilter());
   app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

   if (configService.getOrThrow<boolean>('app.swaggerEnabled')) {
      const username = configService.get<string>('app.swaggerUsername');
      const password = configService.get<string>('app.swaggerPassword');
      setupSwagger(app, username && password ? { username, password } : undefined);
   }

   const port = configService.getOrThrow<number>('app.port');
   await app.listen(port, '0.0.0.0');
}

bootstrap();
