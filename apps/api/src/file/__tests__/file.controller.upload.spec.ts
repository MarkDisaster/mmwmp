import type { AddressInfo, Server } from 'node:net';

import { type ExecutionContext, type INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AuthGuard } from '@/common/guards/auth.guard';
import { Language } from '@/generated/prisma/enums';

import { MAX_DISPLAY_NAME_LENGTH } from '../file.constants';
import { FileController } from '../file.controller';
import { FileService } from '../file.service';

const PDF = Buffer.from('%PDF-1.4\n%%EOF');

describe('FileController upload', () => {
   let app: INestApplication<App>;
   let baseUrl: string;
   const upload = jest.fn();

   const send = (fields: [string, string][]) => {
      const req = request(baseUrl).post('/files').attach('file', PDF, 'a.pdf');
      for (const [name, value] of fields) req.field(name, value);
      return req;
   };

   beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
         controllers: [FileController],
         providers: [{ provide: FileService, useValue: { upload } }],
      })
         .overrideGuard(AuthGuard)
         .useValue({
            canActivate: (ctx: ExecutionContext) => {
               ctx.switchToHttp().getRequest<{ user: unknown }>().user = { id: 1 };
               return true;
            },
         })
         .compile();
      app = moduleRef.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await app.listen(0, '127.0.0.1');
      const { port } = (app.getHttpServer() as Server).address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${port}`;
   });

   afterAll(() => app.close());

   beforeEach(() => {
      upload.mockReset().mockResolvedValue({ id: 1 });
   });

   it('passes the trimmed display name and the language to the service', async () => {
      const response = await send([
         ['displayName', '  Ceník  '],
         ['language', Language.en],
      ]);

      expect(response.status).toBe(201);
      expect(upload).toHaveBeenCalledWith(
         expect.objectContaining({ detectedMimeType: 'application/pdf' }),
         1,
         'Ceník',
         Language.en,
      );
   });

   it('uploads without the optional fields', async () => {
      const response = await send([]);

      expect(response.status).toBe(201);
      expect(upload).toHaveBeenCalledWith(expect.anything(), 1, undefined, undefined);
   });

   it.each([
      [
         'a display name sent twice',
         [
            ['displayName', 'a'],
            ['displayName', 'b'],
         ],
      ],
      ['a display name over the limit', [['displayName', 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1)]]],
      ['a language the API does not have', [['language', 'de']]],
   ] as [string, [string, string][]][])(
      'answers 400 to %s and stores nothing',
      async (_, fields) => {
         const response = await send(fields);

         expect(response.status).toBe(400);
         expect(upload).not.toHaveBeenCalled();
      },
   );

   it('documents the multipart body: the file and the text fields', () => {
      const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
      const body = document.paths['/files'].post?.requestBody as {
         content: Record<string, { schema: { $ref: string } }>;
      };
      const ref = body.content['multipart/form-data'].schema.$ref.split('/').pop() as string;
      const schema = document.components?.schemas?.[ref] as {
         required?: string[];
         properties: Record<string, { type?: string; format?: string; maxLength?: number }>;
      };

      expect(Object.keys(body.content)).toEqual(['multipart/form-data']);
      expect(schema.required).toEqual(['file']);
      expect(schema.properties.file).toMatchObject({ type: 'string', format: 'binary' });
      expect(schema.properties.displayName).toMatchObject({ maxLength: MAX_DISPLAY_NAME_LENGTH });
      expect(schema.properties.language).toBeDefined();
   });
});
