import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import {
   createSwaggerBasicAuth,
   type SwaggerCredentials,
} from '@/common/middleware/swagger-basic-auth.middleware';

export const SWAGGER_PATH = 'api/docs';

export const setupSwagger = (app: NestExpressApplication, credentials?: SwaggerCredentials) => {
   if (credentials) {
      app.use(`/${SWAGGER_PATH}`, createSwaggerBasicAuth(credentials));
   } else {
      new Logger('Swagger').warn(
         'The API documentation is open: set SWAGGER_USERNAME and SWAGGER_PASSWORD to protect it with Basic auth',
      );
   }

   const config = new DocumentBuilder()
      .setTitle('marek.media API')
      .setDescription('Portfolio API')
      .setVersion('1.0')
      .addBearerAuth(
         {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
         },
         'JWT-auth',
      )
      .build();

   const document = SwaggerModule.createDocument(app, config);
   SwaggerModule.setup(SWAGGER_PATH, app, document, {
      jsonDocumentUrl: `${SWAGGER_PATH}/json`,
      raw: ['json'],
   });
};
