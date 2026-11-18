import { PrismaService } from '../../../src/prisma/prisma.service';
import { ProjectService } from '../../../src/project/project.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createProject } from '../../setup/projects';
import { names } from '../../setup/tags';
import { createAdminAndLogin } from '../../setup/users';

const PUBLISHER = { userId: 0, canPublish: true };

describe('Project Media & Tags (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectMedia.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.file.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const PROJECT = { slug: 'test-project', title: 'Test Project' };

   const createFile = async () => {
      return prisma.file.create({
         data: {
            filename: 'test-image.jpg',
            originalName: 'test-image.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            storagePath: 'projects/test-image.jpg',
         },
      });
   };

   const createTag = async (name: string) => {
      return prisma.tag.create({
         data: { translations: names(name), slug: name.toLowerCase() },
      });
   };

   const assignTags = (token: string, projectId: number, tagIds: number[]) =>
      getHttpServer()
         .post(`/projects/${projectId}/tags`)
         .set('Authorization', `Bearer ${token}`)
         .send({ tagIds })
         .expect(201);

   describe('POST /projects/:id/media', () => {
      it('should add file to project', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const file = await createFile();

         const response = await getHttpServer()
            .post(`/projects/${project.id}/media`)
            .set('Authorization', `Bearer ${token}`)
            .send({ fileId: file.id, language: 'cs', sortOrder: 0 });

         expect(response.status).toBe(201);
         expect(response.body.fileId).toBe(file.id);
         expect(response.body.language).toBe('cs');
      });
   });

   describe('DELETE /projects/:id/media/:mediaId', () => {
      it('should remove media from project', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const file = await createFile();

         const addResponse = await getHttpServer()
            .post(`/projects/${project.id}/media`)
            .set('Authorization', `Bearer ${token}`)
            .send({ fileId: file.id })
            .expect(201);

         const response = await getHttpServer()
            .delete(`/projects/${project.id}/media/${addResponse.body.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(204);
      });

      it('should return 404 for non-existent media', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);

         const response = await getHttpServer()
            .delete(`/projects/${project.id}/media/99999`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(404);
      });
   });

   describe('PUT /projects/:id/media/sort', () => {
      it('should reorder media', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const file1 = await createFile();
         const file2 = await prisma.file.create({
            data: {
               filename: 'test-image-2.jpg',
               originalName: 'test-image-2.jpg',
               mimeType: 'image/jpeg',
               size: 2048,
               storagePath: 'projects/test-image-2.jpg',
            },
         });

         const media1 = await getHttpServer()
            .post(`/projects/${project.id}/media`)
            .set('Authorization', `Bearer ${token}`)
            .send({ fileId: file1.id, sortOrder: 0 })
            .expect(201);

         const media2 = await getHttpServer()
            .post(`/projects/${project.id}/media`)
            .set('Authorization', `Bearer ${token}`)
            .send({ fileId: file2.id, sortOrder: 1 })
            .expect(201);

         const response = await getHttpServer()
            .put(`/projects/${project.id}/media/sort`)
            .set('Authorization', `Bearer ${token}`)
            .send({ mediaIds: [media2.body.id, media1.body.id] });

         expect(response.status).toBe(200);

         const sorted = await prisma.projectMedia.findMany({
            where: { projectId: project.id },
            orderBy: { sortOrder: 'asc' },
         });
         expect(sorted[0].id).toBe(media2.body.id);
         expect(sorted[1].id).toBe(media1.body.id);
      });
   });

   describe('public URLs of the files of a project', () => {
      const url = (key: string) => `https://test-storage.local/${key}`;

      const createImage = () =>
         prisma.file.create({
            data: {
               filename: 'thumb',
               originalName: 'thumb.jpg',
               mimeType: 'image/jpeg',
               size: 1024,
               storagePath: 'uploads/thumb',
               variants: {
                  create: [
                     {
                        variant: 'original',
                        storagePath: 'uploads/thumb/original.jpg',
                        mimeType: 'image/jpeg',
                        size: 1024,
                     },
                     {
                        variant: 'thumbnail',
                        storagePath: 'uploads/thumb/thumbnail.webp',
                        mimeType: 'image/webp',
                        size: 128,
                     },
                  ],
               },
            },
         });

      it('should send publicUrl of the thumbnail and of the media files in the detail', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const image = await createImage();
         const document = await createFile();
         await prisma.project.update({
            where: { id: project.id },
            data: { thumbnailId: image.id },
         });
         await getHttpServer()
            .post(`/projects/${project.id}/media`)
            .set('Authorization', `Bearer ${token}`)
            .send({ fileId: document.id });

         const response = await getHttpServer()
            .get(`/projects/${project.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.thumbnail.publicUrl).toBe(url('uploads/thumb/original.jpg'));
         expect(
            response.body.thumbnail.variants.map((v: { publicUrl: string }) => v.publicUrl),
         ).toEqual(
            expect.arrayContaining([
               url('uploads/thumb/original.jpg'),
               url('uploads/thumb/thumbnail.webp'),
            ]),
         );
         expect(response.body.media).toHaveLength(1);
         expect(response.body.media[0].file.publicUrl).toBe(url('projects/test-image.jpg'));
      });

      it('should send publicUrl of the thumbnail in the list', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const image = await createImage();
         await prisma.project.update({
            where: { id: project.id },
            data: { thumbnailId: image.id },
         });

         const response = await getHttpServer()
            .get('/projects')
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(200);
         expect(response.body.data[0].thumbnail.publicUrl).toBe(url('uploads/thumb/original.jpg'));
      });
   });

   describe('POST /projects/:id/tags', () => {
      it('should assign tags to project', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const tag1 = await createTag('React');
         const tag2 = await createTag('NestJS');

         const response = await getHttpServer()
            .post(`/projects/${project.id}/tags`)
            .set('Authorization', `Bearer ${token}`)
            .send({ tagIds: [tag1.id, tag2.id] });

         expect(response.status).toBe(201);
         expect(response.body.tags).toHaveLength(2);
      });

      it('should replace existing tags', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const tag1 = await createTag('React');
         const tag2 = await createTag('NestJS');
         const tag3 = await createTag('TypeScript');

         await assignTags(token, project.id, [tag1.id, tag2.id]);

         const response = await getHttpServer()
            .post(`/projects/${project.id}/tags`)
            .set('Authorization', `Bearer ${token}`)
            .send({ tagIds: [tag3.id] });

         expect(response.status).toBe(201);
         expect(response.body.tags).toHaveLength(1);
      });

      it('should persist sortOrder from array index', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const tag1 = await createTag('React');
         const tag2 = await createTag('NestJS');
         const tag3 = await createTag('TypeScript');

         await assignTags(token, project.id, [tag2.id, tag3.id, tag1.id]);

         const projectTags = await prisma.projectTag.findMany({
            where: { projectId: project.id },
            orderBy: { sortOrder: 'asc' },
         });

         expect(projectTags[0].tagId).toBe(tag2.id);
         expect(projectTags[0].sortOrder).toBe(0);
         expect(projectTags[1].tagId).toBe(tag3.id);
         expect(projectTags[1].sortOrder).toBe(1);
         expect(projectTags[2].tagId).toBe(tag1.id);
         expect(projectTags[2].sortOrder).toBe(2);
      });
   });

   describe('DELETE /projects/:id/tags/:tagId', () => {
      it('should remove tag from project', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const tag = await createTag('React');

         await assignTags(token, project.id, [tag.id]);

         const response = await getHttpServer()
            .delete(`/projects/${project.id}/tags/${tag.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(204);
      });

      it('should return 404 for unassigned tag', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const tag = await createTag('React');

         const response = await getHttpServer()
            .delete(`/projects/${project.id}/tags/${tag.id}`)
            .set('Authorization', `Bearer ${token}`);

         expect(response.status).toBe(404);
      });
   });

   describe('PUT /projects/:id/tags/sort', () => {
      it('should reorder tags', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const tag1 = await createTag('React');
         const tag2 = await createTag('NestJS');
         const tag3 = await createTag('TypeScript');

         await assignTags(token, project.id, [tag1.id, tag2.id, tag3.id]);

         const response = await getHttpServer()
            .put(`/projects/${project.id}/tags/sort`)
            .set('Authorization', `Bearer ${token}`)
            .send({ tagIds: [tag3.id, tag1.id, tag2.id] });

         expect(response.status).toBe(200);

         const sorted = await prisma.projectTag.findMany({
            where: { projectId: project.id },
            orderBy: { sortOrder: 'asc' },
         });
         expect(sorted[0].tagId).toBe(tag3.id);
         expect(sorted[1].tagId).toBe(tag1.id);
         expect(sorted[2].tagId).toBe(tag2.id);
      });

      it('should return 400 for mismatched tag list', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const tag1 = await createTag('React');
         const tag2 = await createTag('NestJS');

         await assignTags(token, project.id, [tag1.id]);

         const response = await getHttpServer()
            .put(`/projects/${project.id}/tags/sort`)
            .set('Authorization', `Bearer ${token}`)
            .send({ tagIds: [tag1.id, tag2.id] });

         expect(response.status).toBe(400);
      });

      it('should return 400 for duplicate tag IDs', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const tag1 = await createTag('React');
         const tag2 = await createTag('NestJS');

         await assignTags(token, project.id, [tag1.id, tag2.id]);

         const response = await getHttpServer()
            .put(`/projects/${project.id}/tags/sort`)
            .set('Authorization', `Bearer ${token}`)
            .send({ tagIds: [tag1.id, tag1.id] });

         expect(response.status).toBe(400);
      });

      it('should return 400 for correct count but wrong tag', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const tag1 = await createTag('React');
         const tag2 = await createTag('NestJS');
         const tag3 = await createTag('Other');

         await assignTags(token, project.id, [tag1.id, tag2.id]);

         const response = await getHttpServer()
            .put(`/projects/${project.id}/tags/sort`)
            .set('Authorization', `Bearer ${token}`)
            .send({ tagIds: [tag1.id, tag3.id] });

         expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent project', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .put('/projects/99999/tags/sort')
            .set('Authorization', `Bearer ${token}`)
            .send({ tagIds: [1] });

         expect(response.status).toBe(404);
      });
   });

   describe('ProjectService.addTag (AI tool addProjectTag)', () => {
      const tagIdsOf = async (projectId: number) =>
         (
            await prisma.projectTag.findMany({
               where: { projectId },
               orderBy: { sortOrder: 'asc' },
            })
         ).map(({ tagId }) => tagId);

      it('should attach the tag last and keep the others', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const react = await createTag('React');
         const nest = await createTag('NestJS');
         const vue = await createTag('Vue');
         await assignTags(token, project.id, [nest.id, react.id]);

         const result = await getApp().get(ProjectService).addTag(project.id, vue.id, PUBLISHER);

         expect(result.added).toBe(true);
         expect(result.project.tags.map(({ tagId }) => tagId)).toEqual([nest.id, react.id, vue.id]);
         expect(await tagIdsOf(project.id)).toEqual([nest.id, react.id, vue.id]);
      });

      it('should change nothing for a tag the project already has', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const react = await createTag('React');
         const projects = getApp().get(ProjectService);
         await projects.addTag(project.id, react.id, PUBLISHER);

         const result = await projects.addTag(project.id, react.id, PUBLISHER);

         expect(result.added).toBe(false);
         expect(await tagIdsOf(project.id)).toEqual([react.id]);
      });

      it('should reject an unknown tag and an unknown project', async () => {
         const token = await createAdminAndLogin();
         const project = await createProject(token, PROJECT);
         const react = await createTag('React');
         const projects = getApp().get(ProjectService);

         await expect(projects.addTag(project.id, react.id + 1000, PUBLISHER)).rejects.toThrow(
            'Tag not found',
         );
         await expect(projects.addTag(project.id + 1000, react.id, PUBLISHER)).rejects.toThrow(
            'Project not found',
         );
         expect(await tagIdsOf(project.id)).toEqual([]);
      });
   });
});
