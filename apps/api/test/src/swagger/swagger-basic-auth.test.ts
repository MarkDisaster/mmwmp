import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import { setupSwagger } from '../../../src/config/swagger';
import { StorageService } from '../../../src/storage/storage.service';
import { StorageTestService } from '../../../src/storage/storage.test-service';

const USERNAME = 'docs-reader';
const PASSWORD = 'a-test-password:with-colon-16+';
const AUTH = `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`;

const createApp = async (swagger: 'off' | 'open' | 'protected') => {
   const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useClass(StorageTestService)
      .compile();
   const app = moduleRef.createNestApplication<NestExpressApplication>();
   if (swagger === 'open') {
      setupSwagger(app);
   } else if (swagger === 'protected') {
      setupSwagger(app, { username: USERNAME, password: PASSWORD });
   }
   await app.listen(0, '127.0.0.1');
   return app;
};

describe('Swagger documentation (e2e)', () => {
   describe('with Basic auth', () => {
      let app: NestExpressApplication;
      beforeAll(async () => {
         app = await createApp('protected');
      });
      afterAll(async () => {
         await app.close();
      });

      it.each([
         '/api/docs',
         '/api/docs/',
         '/api/docs/index.html',
         '/api/docs/json',
         '/api/docs/swagger-ui-init.js',
         '/api/docs/swagger-ui-bundle.js',
         '/api/docs/swagger-ui.css',
      ])('answers 401 with a challenge for %s without credentials', async (path) => {
         const response = await request(app.getHttpServer()).get(path);
         expect(response.status).toBe(401);
         expect(response.headers['www-authenticate']).toBe(
            'Basic realm="API docs", charset="UTF-8"',
         );
         expect(response.text).toBe('');
      });

      it.each([
         '/api/docs-yaml',
         '/API/DOCS-YAML',
         '/api/docs-yaml?x=1',
         '/api/docs-yaml/',
         '/api/docs/yaml',
         '/api/docs-json',
      ])('does not serve the document on %s, with or without the credentials', async (path) => {
         const anonymous = await request(app.getHttpServer()).get(path);
         expect([401, 404]).toContain(anonymous.status);
         expect(anonymous.text).not.toContain('openapi');

         const authorized = await request(app.getHttpServer()).get(path).set('Authorization', AUTH);
         expect(authorized.text).not.toContain('openapi');
      });

      it('answers 401 for wrong credentials', async () => {
         const wrong = `Basic ${Buffer.from(`${USERNAME}:nope`).toString('base64')}`;
         const response = await request(app.getHttpServer())
            .get('/api/docs/json')
            .set('Authorization', wrong);
         expect(response.status).toBe(401);
      });

      it.each([
         ['/api/docs', 'text/html'],
         ['/api/docs/json', 'application/json'],
         ['/api/docs/swagger-ui-init.js', 'javascript'],
         ['/api/docs/swagger-ui-bundle.js', 'javascript'],
      ])('answers 200 for %s with the credentials', async (path, type) => {
         const response = await request(app.getHttpServer()).get(path).set('Authorization', AUTH);
         expect(response.status).toBe(200);
         expect(response.headers['content-type']).toContain(type);
      });

      it('serves the OpenAPI document of the API', async () => {
         const response = await request(app.getHttpServer())
            .get('/api/docs/json')
            .set('Authorization', AUTH);
         expect(response.body.info.title).toBe('marek.media API');
      });

      it('does not touch the API itself', async () => {
         const response = await request(app.getHttpServer()).get('/health');
         expect(response.status).toBe(200);
      });
   });

   describe('without credentials configured (staging, as before)', () => {
      let app: NestExpressApplication;
      beforeAll(async () => {
         app = await createApp('open');
      });
      afterAll(async () => {
         await app.close();
      });

      it.each(['/api/docs', '/api/docs/json'])('answers 200 for %s', async (path) => {
         const response = await request(app.getHttpServer()).get(path);
         expect(response.status).toBe(200);
      });

      it('does not serve the YAML variant', async () => {
         const response = await request(app.getHttpServer()).get('/api/docs-yaml');
         expect(response.status).toBe(404);
      });
   });

   describe('disabled', () => {
      let app: NestExpressApplication;
      beforeAll(async () => {
         app = await createApp('off');
      });
      afterAll(async () => {
         await app.close();
      });

      it.each(['/api/docs', '/api/docs/json', '/api/docs-yaml', '/api/docs/swagger-ui-init.js'])(
         'answers 404 for %s',
         async (path) => {
            const response = await request(app.getHttpServer()).get(path);
            expect(response.status).toBe(404);
         },
      );
   });
});
