import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { PrismaService } from '../../../src/prisma/prisma.service';
import { createTestDocx, createTestJpeg, createTestZip } from '../../setup/files';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin } from '../../setup/users';

describe('FileController (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectMedia.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.file.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   describe('POST /files', () => {
      it('should upload a file', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', await createTestJpeg(), {
               filename: 'test-image.jpg',
               contentType: 'image/jpeg',
            });

         expect(response.status).toBe(201);
         expect(response.body.originalName).toBe('test-image.jpg');
         expect(response.body.mimeType).toBe('image/jpeg');
         expect(response.body.storagePath).toBeDefined();
         expect(response.body.width).toBe(2);
         expect(response.body.height).toBe(2);
      });

      it('should store a JPEG claimed as text/html as image/jpeg with a .jpg key', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', await createTestJpeg(), {
               filename: 'a.html',
               contentType: 'text/html',
            });

         expect(response.status).toBe(201);
         expect(response.body.mimeType).toBe('image/jpeg');
         expect(response.body.publicUrl).toMatch(/\/original\.jpg$/);
      });

      it('should store JPEG bytes claimed as a PDF as an image', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', await createTestJpeg(), {
               filename: 'scan.pdf',
               contentType: 'application/pdf',
            });

         expect(response.status).toBe(201);
         expect(response.body.mimeType).toBe('image/jpeg');
         expect(response.body.width).toBe(2);
      });

      it('should accept a ZIP claimed as application/x-zip-compressed', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', createTestZip({ 'a.txt': 'hello' }), {
               filename: 'archive.zip',
               contentType: 'application/x-zip-compressed',
            });

         expect(response.status).toBe(201);
         expect(response.body.mimeType).toBe('application/zip');
         expect(response.body.storagePath).toMatch(/\/original\.zip$/);
      });

      it('should keep the storage path of a file that is not an image as uploads/<filename>/original.<ext>', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', createTestZip({ 'a.txt': 'hello' }), {
               filename: 'archive.zip',
               contentType: 'application/zip',
            });

         expect(response.status).toBe(201);
         const row = await prisma.file.findUniqueOrThrow({ where: { id: response.body.id } });
         expect(row.storagePath).toBe(`uploads/${row.filename}/original.zip`);
      });

      it('should store the trimmed display name and the language of the form', async () => {
         const token = await createAdminAndLogin();
         const send = (displayName: string) =>
            getHttpServer()
               .post('/files')
               .set('Authorization', `Bearer ${token}`)
               .field('displayName', displayName)
               .field('language', 'en')
               .attach('file', createTestZip({ 'a.txt': 'hello' }), {
                  filename: 'archive.zip',
                  contentType: 'application/zip',
               });

         const named = await send('  Ceník  ');
         const blank = await send('   ');

         expect([named.status, blank.status]).toEqual([201, 201]);
         const rows = await prisma.file.findMany({
            where: { id: { in: [named.body.id, blank.body.id] } },
            orderBy: { id: 'asc' },
            select: { displayName: true, language: true },
         });
         expect(rows).toEqual([
            { displayName: 'Ceník', language: 'en' },
            { displayName: null, language: 'en' },
         ]);
      });

      it.each([
         [
            'a display name sent twice',
            [
               ['displayName', 'a'],
               ['displayName', 'b'],
            ],
         ],
         ['a language the API does not have', [['language', 'de']]],
      ] as [string, [string, string][]][])(
         'should answer 400 to %s and store nothing',
         async (_, fields) => {
            const token = await createAdminAndLogin();
            const req = getHttpServer().post('/files').set('Authorization', `Bearer ${token}`);
            for (const [name, value] of fields) req.field(name, value);

            const response = await req.attach('file', createTestZip({ 'a.txt': 'hello' }), {
               filename: 'archive.zip',
               contentType: 'application/zip',
            });

            expect(response.status).toBe(400);
            expect(await prisma.file.count()).toBe(0);
         },
      );

      it('should accept a Word document', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', createTestDocx(), {
               filename: 'brief.docx',
               contentType:
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

         expect(response.status).toBe(201);
         expect(response.body.mimeType).toBe(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         );
         expect(response.body.storagePath).toMatch(/\/original\.docx$/);
      });

      it('should refuse bytes without a known type, whatever the claim', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from('<html><script>x()</script></html>'), {
               filename: 'a.pdf',
               contentType: 'application/pdf',
            });

         expect(response.status).toBe(400);
      });

      it('should store the type found in the bytes, not the claimed one', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', await createTestJpeg(), {
               filename: 'photo.png',
               contentType: 'image/png',
            });

         expect(response.status).toBe(201);
         expect(response.body.mimeType).toBe('image/jpeg');
      });

      it('should refuse SVG, which the API cannot check and which runs script', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), {
               filename: 'icon.svg',
               contentType: 'image/svg+xml',
            });

         expect(response.status).toBe(400);
      });

      it('should return 401 without auth', async () => {
         const response = await getHttpServer().post('/files').attach('file', Buffer.from('test'), {
            filename: 'test.jpg',
            contentType: 'image/jpeg',
         });

         expect(response.status).toBe(401);
      });
   });

   describe('GET /files', () => {
      it('should return list of files', async () => {
         const token = await createAdminAndLogin();

         await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', await createTestJpeg(), {
               filename: 'file1.jpg',
               contentType: 'image/jpeg',
            });

         await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', await createTestJpeg(), {
               filename: 'file2.png',
               contentType: 'image/png',
            });

         const response = await getHttpServer()
            .get('/files')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(2);
         expect(response.body.data).toHaveLength(2);
         expect(response.body.data[0].publicUrl).toBeDefined();
      });
   });

   describe('GET /files?mimeTypePrefix', () => {
      const seedFiles = () =>
         prisma.file.createMany({
            data: [
               ['photo.jpg', 'image/jpeg'],
               ['logo.png', 'image/png'],
               ['icon.svg', 'image/svg+xml'],
               ['brief.pdf', 'application/pdf'],
               ['clip.mp4', 'video/mp4'],
            ].map(([name, mimeType]) => ({
               filename: name,
               originalName: name,
               mimeType,
               size: 1024,
               storagePath: `uploads/${name}`,
            })),
         });

      const list = (token: string, query: string) =>
         getHttpServer().get(`/files?${query}`).set('Authorization', `Bearer ${token}`);

      const namesOf = (body: { data: { originalName: string }[] }) =>
         body.data.map((file) => file.originalName).sort();

      it('should return only the files of the given type family', async () => {
         const token = await createAdminAndLogin();
         await seedFiles();

         const response = await list(token, 'mimeTypePrefix=image/');

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(3);
         expect(namesOf(response.body)).toEqual(['icon.svg', 'logo.png', 'photo.jpg']);
      });

      it('should narrow to one exact type, including a subtype with a plus sign', async () => {
         const token = await createAdminAndLogin();
         await seedFiles();

         const png = await list(token, 'mimeTypePrefix=image/png');
         const svg = await list(token, `mimeTypePrefix=${encodeURIComponent('image/svg+xml')}`);

         expect(namesOf(png.body)).toEqual(['logo.png']);
         expect(namesOf(svg.body)).toEqual(['icon.svg']);
      });

      it('should return every file without the filter', async () => {
         const token = await createAdminAndLogin();
         await seedFiles();

         const response = await list(token, '');

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(5);
         expect(response.body.data).toHaveLength(5);
      });

      it('should combine the filter with search and paging, counting only the matches', async () => {
         const token = await createAdminAndLogin();
         await seedFiles();

         const searched = await list(token, 'mimeTypePrefix=image/&search=LOGO');
         const paged = await list(
            token,
            'mimeTypePrefix=image/&limit=2&page=1&sortBy=originalName',
         );

         expect(namesOf(searched.body)).toEqual(['logo.png']);
         expect(searched.body.totalCount).toBe(1);
         expect(paged.body.totalCount).toBe(3);
         expect(namesOf(paged.body)).toEqual(['photo.jpg']);
      });

      it.each(['image', 'IMAGE/', '%', 'image/%', '_mage/', '*/*'])(
         'should reject the prefix %p with 400 instead of matching it as a pattern',
         async (prefix) => {
            const token = await createAdminAndLogin();
            await seedFiles();

            const response = await list(token, `mimeTypePrefix=${encodeURIComponent(prefix)}`);

            expect(response.status).toBe(400);
            expect(response.body.message).toEqual(
               expect.arrayContaining([expect.stringContaining('mimeTypePrefix')]),
            );
         },
      );

      it('should reject a repeated prefix', async () => {
         const token = await createAdminAndLogin();

         const response = await list(token, 'mimeTypePrefix=image/&mimeTypePrefix=video/');

         expect(response.status).toBe(400);
      });

      it('should keep the limit cap of 100', async () => {
         const token = await createAdminAndLogin();

         const response = await list(token, 'mimeTypePrefix=image/&limit=101');

         expect(response.status).toBe(400);
      });
   });

   describe('OpenAPI', () => {
      type Schema = {
         required?: string[];
         properties?: Record<string, Schema & { nullable?: boolean }>;
      };
      const document = () =>
         SwaggerModule.createDocument(getApp(), new DocumentBuilder().build()) as unknown as {
            paths: Record<
               string,
               Record<
                  string,
                  {
                     parameters: { name: string; in: string; required: boolean; schema: unknown }[];
                     responses: Record<string, { content?: Record<string, { schema: Schema }> }>;
                  }
               >
            >;
            components: { schemas: Record<string, Schema> };
         };

      it('should document the mimeTypePrefix filter of the file list', () => {
         const parameter = document().paths['/files'].get.parameters.find(
            (p) => p.name === 'mimeTypePrefix',
         );

         expect(parameter).toMatchObject({
            in: 'query',
            required: false,
            schema: { type: 'string', pattern: '^[a-z]+/[a-z0-9.+-]*$', maxLength: 100 },
         });
      });

      it('should mark the list fields and the nullable file fields as required', () => {
         const { paths, components } = document();

         expect(
            paths['/files'].get.responses['200'].content?.['application/json'].schema.required,
         ).toEqual(['data', 'totalCount']);
         expect(components.schemas.FileEntity.required).toEqual(
            expect.arrayContaining([
               'displayName',
               'width',
               'height',
               'language',
               'processingError',
               'createdById',
            ]),
         );
         expect(components.schemas.FileEntity.required).not.toContain('createdBy');
         expect(components.schemas.FileVariantEntity.required).toEqual(
            expect.arrayContaining(['width', 'height']),
         );
      });
   });

   describe('GET /files/:id', () => {
      it('should return file detail', async () => {
         const token = await createAdminAndLogin();

         const uploaded = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', await createTestJpeg(), {
               filename: 'detail.jpg',
               contentType: 'image/jpeg',
            });

         const response = await getHttpServer()
            .get(`/files/${uploaded.body.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.originalName).toBe('detail.jpg');
         expect(response.body.publicUrl).toContain('test-storage.local');
      });

      it('should return 404 for non-existent file', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .get('/files/99999')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(404);
      });
   });

   describe('DELETE /files/:id', () => {
      it('should delete file', async () => {
         const token = await createAdminAndLogin();

         const uploaded = await getHttpServer()
            .post('/files')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', await createTestJpeg(), {
               filename: 'delete-me.jpg',
               contentType: 'image/jpeg',
            });

         const response = await getHttpServer()
            .delete(`/files/${uploaded.body.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(204);

         const check = await getHttpServer()
            .get(`/files/${uploaded.body.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(check.status).toBe(404);
      });

      it('should return 404 for non-existent file', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .delete('/files/99999')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(404);
      });

      it('should move a file that is project media to the trash and keep the project reference', async () => {
         const token = await createAdminAndLogin();
         const project = await getHttpServer()
            .post('/projects')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Test Project', slug: 'test-project', language: 'cs' })
            .expect(201);
         const file = await prisma.file.create({
            data: {
               filename: 'in-use.jpg',
               originalName: 'in-use.jpg',
               mimeType: 'image/jpeg',
               size: 1024,
               storagePath: 'projects/in-use.jpg',
            },
         });
         await getHttpServer()
            .post(`/projects/${project.body.id}/media`)
            .set('Authorization', `Bearer ${token}`)
            .send({ fileId: file.id, language: 'cs', sortOrder: 0 })
            .expect(201);

         const response = await getHttpServer()
            .delete(`/files/${file.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(204);
         expect(
            (await prisma.file.findUniqueOrThrow({ where: { id: file.id } })).deletedAt,
         ).not.toBeNull();
         expect(await prisma.projectMedia.count({ where: { fileId: file.id } })).toBe(1);
      });
   });
});
