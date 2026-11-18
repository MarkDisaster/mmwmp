import { adminContext } from '../../../src/ai/tools/__tests__/tool-context.fixture';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { FindProjectsTool } from '../../../src/project/tools/find-projects.tool';
import { GetProjectTool } from '../../../src/project/tools/get-project.tool';
import { CreateTagTool } from '../../../src/tag/tools/create-tag.tool';
import { DeleteTagTool } from '../../../src/tag/tools/delete-tag.tool';
import { FindTagsTool } from '../../../src/tag/tools/find-tags.tool';
import { GetTagTool } from '../../../src/tag/tools/get-tag.tool';
import { ListTagsTool } from '../../../src/tag/tools/list-tags.tool';
import { UpdateTagTool } from '../../../src/tag/tools/update-tag.tool';
import { FindUsersTool } from '../../../src/user/tools/find-users.tool';
import { getApp, getHttpServer } from '../../setup/init';
import { names } from '../../setup/tags';
import { createAdminAndLogin, createTestUser } from '../../setup/users';

describe('AURORA lookup tools against the database (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectTag.deleteMany();
      await prisma.projectTranslation.deleteMany();
      await prisma.project.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.message.deleteMany();
      await prisma.conversation.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const createProject = (slug: string, cs: string, en: string) =>
      prisma.project.create({
         data: {
            slug,
            title: cs,
            translations: {
               create: [
                  { language: 'cs', title: cs },
                  { language: 'en', title: en },
               ],
            },
         },
      });

   it('finds a project by its English title without diacritics and with a typo', async () => {
      const hospital = await createProject(
         'nemocnice-jh',
         'Nemocnice Jindřichův Hradec',
         'Hospital',
      );
      await createProject('selltoro', 'Selltoro', 'Selltoro marketplace');
      const tool = getApp().get(FindProjectsTool);

      const byTranslation = await tool.execute(adminContext(), { query: 'hospitl' });
      const byAccentless = await tool.execute(adminContext(), { query: 'jindrichuv' });

      expect(byTranslation.items).toMatchObject([
         { id: hospital.id, adminUrl: `/projects/${hospital.id}`, matchedOn: 'title (en)' },
      ]);
      expect(byAccentless.items.map(({ id }) => id)).toEqual([hospital.id]);
   });

   it('returns the tags of a project in display order with their ids', async () => {
      const project = await createProject('selltoro', 'Selltoro', 'Selltoro');
      const [react, nest] = await Promise.all([
         prisma.tag.create({ data: { translations: names('React'), slug: 'react' } }),
         prisma.tag.create({ data: { translations: names('NestJS'), slug: 'nestjs' } }),
      ]);
      await prisma.projectTag.createMany({
         data: [
            { projectId: project.id, tagId: nest.id, sortOrder: 0 },
            { projectId: project.id, tagId: react.id, sortOrder: 1 },
         ],
      });

      const detail = await getApp().get(GetProjectTool).execute(adminContext(), { id: project.id });

      expect(detail.tags.map(({ name }) => name)).toEqual(['NestJS', 'React']);
      expect(detail.translations.map(({ language }) => language).sort()).toEqual(['cs', 'en']);
   });

   describe('tags with translations', () => {
      const translations = [
         { language: 'cs' as const, name: 'Případová studie' },
         { language: 'en' as const, name: 'Case study' },
      ];

      it('creates a tag with both names, finds it by either, and reads it back', async () => {
         const created = await getApp()
            .get(CreateTagTool)
            .execute(adminContext(), { slug: 'pripadova-studie', translations });

         expect(created).toMatchObject({
            name: 'Případová studie',
            names: { cs: 'Případová studie', en: 'Case study' },
         });
         const find = getApp().get(FindTagsTool);
         const byEnglish = await find.execute(adminContext(), { query: 'case studi' });
         const byCzech = await find.execute(adminContext(), { query: 'pripadova' });
         expect(byEnglish.items).toMatchObject([{ id: created.id, matchedOn: 'name (en)' }]);
         expect(byCzech.items.map(({ id }) => id)).toEqual([created.id]);
         const got = await getApp().get(GetTagTool).execute(adminContext(), { id: created.id });
         expect(got.names).toEqual({ cs: 'Případová studie', en: 'Case study' });
         const list = await getApp()
            .get(ListTagsTool)
            .execute(adminContext(), { search: 'case study' });
         expect(list.items).toMatchObject([{ id: created.id, names: { en: 'Case study' } }]);
      });

      it('updates the names: adds, changes and removes the English one, keeps Czech', async () => {
         const tag = await prisma.tag.create({
            data: { slug: 'studie', translations: names('Studie') },
         });
         const update = getApp().get(UpdateTagTool);

         const added = await update.execute(adminContext(), {
            id: tag.id,
            currentName: 'Studie',
            translations: [{ language: 'en', name: 'Study' }],
         });
         expect(added.names).toEqual({ cs: 'Studie', en: 'Study' });

         const changed = await update.execute(adminContext(), {
            id: tag.id,
            currentName: 'Studie',
            translations: [{ language: 'cs', name: 'Studie 2' }],
         });
         expect(changed.names).toEqual({ cs: 'Studie 2', en: 'Study' });

         const removed = await update.execute(adminContext(), {
            id: tag.id,
            currentName: 'Studie 2',
            removeLanguages: ['en'],
         });
         expect(removed.names).toEqual({ cs: 'Studie 2', en: null });
         expect(await prisma.tagTranslation.count({ where: { tagId: tag.id } })).toBe(1);
      });

      it('changes nothing when the tag is named otherwise than the tile said', async () => {
         const tag = await prisma.tag.create({
            data: { slug: 'studie', translations: names('Studie') },
         });

         await expect(
            getApp()
               .get(UpdateTagTool)
               .execute(adminContext(), {
                  id: tag.id,
                  currentName: 'Stale name',
                  translations: [{ language: 'cs', name: 'Renamed' }],
               }),
         ).rejects.toThrow('now named "Studie"');
         await expect(
            getApp()
               .get(DeleteTagTool)
               .execute(adminContext(), { id: tag.id, currentName: 'Stale name' }),
         ).rejects.toThrow('now named "Studie"');

         const stored = await prisma.tag.findUniqueOrThrow({
            where: { id: tag.id },
            include: { translations: true },
         });
         expect(stored.deletedAt).toBeNull();
         expect(stored.translations.map((t) => t.name)).toEqual(['Studie']);
      });
   });

   it('leaves deleted users out', async () => {
      const kept = await createTestUser({ email: 'jan.novak@example.com', role: 'editor' });
      const deleted = await createTestUser({ email: 'jana.novakova@example.com', role: 'editor' });
      await prisma.user.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });

      const result = await getApp().get(FindUsersTool).execute(adminContext(), { query: 'novak' });

      expect(result.items.map(({ id }) => id)).toEqual([kept.id]);
   });

   it('rejects a chat request whose page context is not an admin path', async () => {
      const token = await createAdminAndLogin();
      const { body: conversation } = await getHttpServer()
         .post('/chat/conversations')
         .set('Authorization', `Bearer ${token}`);

      const response = await getHttpServer()
         .post(`/chat/conversations/${conversation.id}/stream`)
         .set('Authorization', `Bearer ${token}`)
         .send({
            messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'ahoj' }] }],
            pageContext: { path: 'javascript:alert(1)' },
         });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body.message)).toContain('pageContext.path');
   });
});
