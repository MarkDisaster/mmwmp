import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createProject } from '../../setup/projects';
import { createAdminAndLogin } from '../../setup/users';

describe('Project links (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectLink.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.projectMedia.deleteMany();
      await prisma.project.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const PROJECT = { slug: 'links-project', title: 'Links Project' };

   const putLinks = (token: string, id: number, links: unknown) =>
      getHttpServer()
         .put(`/projects/${id}/links`)
         .set('Authorization', `Bearer ${token}`)
         .send({ links });

   it('should store links in the sent order and return them with the project', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);

      const response = await putLinks(token, id, [
         { label: 'GitHub', url: 'https://github.com/example/repo' },
         { label: 'Case study', url: 'https://example.com/case-study' },
         { url: 'https://storybook.example.com' },
      ]);
      const detail = await getHttpServer()
         .get(`/projects/${id}`)
         .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(detail.body.links.map((l: { url: string }) => l.url)).toEqual([
         'https://github.com/example/repo',
         'https://example.com/case-study',
         'https://storybook.example.com',
      ]);
      expect(detail.body.links.map((l: { sortOrder: number }) => l.sortOrder)).toEqual([0, 1, 2]);
   });

   it('should store a blank label as null', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);

      const response = await putLinks(token, id, [
         { label: '   ', url: 'https://example.com' },
         { url: 'https://example.org' },
      ]);

      expect(response.status).toBe(200);
      expect(response.body.links.map((l: { label: string | null }) => l.label)).toEqual([
         null,
         null,
      ]);
   });

   it('should replace the existing links instead of adding to them', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);
      await putLinks(token, id, [
         { url: 'https://one.example.com' },
         { url: 'https://two.example.com' },
      ]).expect(200);

      const response = await putLinks(token, id, [{ url: 'https://three.example.com' }]);

      expect(response.body.links.map((l: { url: string }) => l.url)).toEqual([
         'https://three.example.com',
      ]);
      expect(await prisma.projectLink.count({ where: { projectId: id } })).toBe(1);
   });

   it('should remove all links when an empty list is sent', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);
      await putLinks(token, id, [{ url: 'https://example.com' }]).expect(200);

      const response = await putLinks(token, id, []);

      expect(response.status).toBe(200);
      expect(response.body.links).toEqual([]);
   });

   it('should reject an invalid URL', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);

      const response = await putLinks(token, id, [{ label: 'Bad', url: 'not a url' }]);

      expect(response.status).toBe(400);
   });

   it('should reject a URL without a protocol', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);

      const response = await putLinks(token, id, [{ url: 'github.com/example/repo' }]);

      expect(response.status).toBe(400);
   });

   it.each([
      'javascript:alert(1)',
      'ftp://example.com/file',
      'mailto:me@example.com',
      'https:example.com',
      'https://localhost',
      'https://127.0.0.1',
      'https://user:pass@example.com',
      'https://example.com/ with space',
      `https://example.com/${'a'.repeat(2048)}`,
   ])('should reject the invalid URL %s', async (url) => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);

      const response = await putLinks(token, id, [{ url }]);

      expect(response.status).toBe(400);
      expect(await prisma.projectLink.count()).toBe(0);
   });

   it('should accept an internationalised domain name', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);

      const response = await putLinks(token, id, [{ url: 'https://пример.рф' }]);

      expect(response.status).toBe(200);
      expect(response.body.links[0].url).toBe('https://пример.рф');
   });

   it('should reject a label longer than 50 characters', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);

      const response = await putLinks(token, id, [
         { label: 'x'.repeat(51), url: 'https://example.com' },
      ]);

      expect(response.status).toBe(400);
   });

   it('should accept the main link plus 10 more', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);
      const links = Array.from({ length: 11 }, (_, i) => ({ url: `https://example.com/${i}` }));

      const response = await putLinks(token, id, links);

      expect(response.status).toBe(200);
      expect(response.body.links).toHaveLength(11);
   });

   it('should reject more than 11 links', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);
      const links = Array.from({ length: 12 }, (_, i) => ({ url: `https://example.com/${i}` }));

      const response = await putLinks(token, id, links);

      expect(response.status).toBe(400);
   });

   it('should store a pure reorder of the same links', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);
      await putLinks(token, id, [
         { label: 'Web', url: 'https://example.com' },
         { label: 'GitHub', url: 'https://github.com/example/repo' },
      ]).expect(200);

      const response = await putLinks(token, id, [
         { label: 'GitHub', url: 'https://github.com/example/repo' },
         { label: 'Web', url: 'https://example.com' },
      ]);

      expect(response.status).toBe(200);
      expect(response.body.links.map((l: { label: string }) => l.label)).toEqual(['GitHub', 'Web']);
   });

   it('should not return a separate project URL', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);

      const response = await putLinks(token, id, [{ url: 'https://example.com' }]);

      expect(response.body).not.toHaveProperty('url');
   });

   it('should return 404 for a non-existent project', async () => {
      const token = await createAdminAndLogin();

      const response = await putLinks(token, 999999, [{ url: 'https://example.com' }]);

      expect(response.status).toBe(404);
   });

   it('should expose the links on the public project endpoint', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);
      await putLinks(token, id, [
         { label: 'GitHub', url: 'https://github.com/example/repo' },
         { url: 'https://example.com' },
      ]);
      await getHttpServer()
         .patch(`/projects/${id}/status`)
         .set('Authorization', `Bearer ${token}`)
         .send({ status: 'published' });

      const response = await getHttpServer().get('/public/projects/links-project');

      expect(response.status).toBe(200);
      expect(response.body.links).toHaveLength(2);
      expect(response.body.links[0]).toMatchObject({
         label: 'GitHub',
         url: 'https://github.com/example/repo',
      });
   });

   it('should keep the links of a trashed project and delete them together with it for good', async () => {
      const token = await createAdminAndLogin();
      const { id } = await createProject(token, PROJECT);
      await putLinks(token, id, [{ url: 'https://example.com' }]);

      const trashed = await getHttpServer()
         .delete(`/projects/${id}`)
         .set('Authorization', `Bearer ${token}`);

      expect(trashed.status).toBe(204);
      expect(await prisma.projectLink.count()).toBe(1);

      const removed = await getHttpServer()
         .delete(`/projects/${id}/permanent`)
         .set('Authorization', `Bearer ${token}`);

      expect(removed.status).toBe(204);
      expect(await prisma.projectLink.count()).toBe(0);
   });
});
