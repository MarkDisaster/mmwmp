import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { names } from '../../setup/tags';
import { createTestUser, loginAs } from '../../setup/users';

describe('Author e-mail of embedded users (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.projectTag.deleteMany();
      await prisma.project.deleteMany();
      await prisma.service.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.fileVariant.deleteMany();
      await prisma.file.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { isSystem: false } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const AUTHOR_EMAIL = 'author@test.com';

   const seed = async () => {
      const author = await createTestUser({
         email: AUTHOR_EMAIL,
         firstName: 'Jana',
         lastName: 'Autorová',
      });
      const createdById = author.id;
      const project = await prisma.project.create({ data: { slug: 'p', createdById } });
      const service = await prisma.service.create({ data: { slug: 's', createdById } });
      const tag = await prisma.tag.create({
         data: { translations: names('React'), slug: 'react', createdById },
      });
      const file = await prisma.file.create({
         data: {
            filename: 'a.jpg',
            originalName: 'a.jpg',
            mimeType: 'image/jpeg',
            size: 1,
            storagePath: 'uploads/a.jpg',
            createdById,
         },
      });
      await prisma.auditLog.create({
         data: { userId: author.id, actorType: 'user', action: 'tag.create', resourceType: 'tag' },
      });
      const reader = await prisma.role.create({
         data: {
            name: 'reader',
            createdById,
            permissions: {
               create: ['projects', 'services', 'tags', 'files', 'roles', 'audit_logs'].map(
                  (resource) => ({ resource: resource as never, action: 'read' as const }),
               ),
            },
         },
      });
      await createTestUser({ email: 'reader@test.com', role: 'reader' });
      return { author, project, service, tag, file, reader };
   };

   type Seed = Awaited<ReturnType<typeof seed>>;

   const endpoints: Array<[string, (s: Seed) => string, (body: never) => unknown]> = [
      [
         'GET /projects',
         () => '/projects',
         (b: { data: Array<{ createdBy: unknown }> }) => b.data[0].createdBy,
      ],
      [
         'GET /projects/:id',
         (s) => `/projects/${s.project.id}`,
         (b: { createdBy: unknown }) => b.createdBy,
      ],
      [
         'GET /services',
         () => '/services',
         (b: { data: Array<{ createdBy: unknown }> }) => b.data[0].createdBy,
      ],
      [
         'GET /tags',
         () => '/tags',
         (b: { data: Array<{ createdBy: unknown }> }) => b.data[0].createdBy,
      ],
      ['GET /tags/:id', (s) => `/tags/${s.tag.id}`, (b: { createdBy: unknown }) => b.createdBy],
      [
         'GET /files',
         () => '/files',
         (b: { data: Array<{ createdBy: unknown }> }) => b.data[0].createdBy,
      ],
      ['GET /files/:id', (s) => `/files/${s.file.id}`, (b: { createdBy: unknown }) => b.createdBy],
      [
         'GET /roles',
         () => '/roles?search=reader',
         (b: { data: Array<{ createdBy: unknown }> }) => b.data[0].createdBy,
      ],
      [
         'GET /roles/:id',
         (s) => `/roles/${s.reader.id}`,
         (b: { createdBy: unknown }) => b.createdBy,
      ],
      [
         'GET /audit/logs',
         () => '/audit/logs',
         (b: { data: Array<{ user: unknown }> }) => b.data[0].user,
      ],
   ];

   const fetchAuthor = async (token: string, path: string, pick: (body: never) => unknown) => {
      const response = await getHttpServer().get(path).set('Authorization', `Bearer ${token}`);
      expect({ path, status: response.status }).toEqual({ path, status: 200 });
      return pick(response.body as never) as Record<string, unknown>;
   };

   it.each(endpoints)(
      '%s: a role without users.read gets the name, not the e-mail',
      async (_n, path, pick) => {
         const s = await seed();
         const token = await loginAs('reader@test.com');

         const author = await fetchAuthor(token, path(s), pick);

         expect(author).toMatchObject({ id: s.author.id, firstName: 'Jana', lastName: 'Autorová' });
         expect(author).not.toHaveProperty('email');
      },
   );

   it.each(endpoints)('%s: an admin gets the e-mail', async (_n, path, pick) => {
      const s = await seed();
      const token = await loginAs(AUTHOR_EMAIL);
      await createTestUser({ email: 'admin2@test.com' });
      const otherAdmin = await loginAs('admin2@test.com');

      expect(await fetchAuthor(otherAdmin, path(s), pick)).toMatchObject({ email: AUTHOR_EMAIL });
      expect(await fetchAuthor(token, path(s), pick)).toMatchObject({ email: AUTHOR_EMAIL });
   });

   it('gives a role with users.read the e-mail without being an admin', async () => {
      const s = await seed();
      await prisma.rolePermission.create({
         data: { roleId: s.reader.id, resource: 'users', action: 'read' },
      });
      const token = await loginAs('reader@test.com');

      expect(await fetchAuthor(token, `/projects/${s.project.id}`, endpoints[1][2])).toMatchObject({
         email: AUTHOR_EMAIL,
      });
   });

   it('gives a user without users.read their own e-mail as the author', async () => {
      const s = await seed();
      const own = await prisma.tag.create({
         data: {
            translations: names('Own'),
            slug: 'own',
            createdById: (
               await prisma.user.findUniqueOrThrow({ where: { email: 'reader@test.com' } })
            ).id,
         },
      });
      const token = await loginAs('reader@test.com');

      expect(await fetchAuthor(token, `/tags/${own.id}`, endpoints[4][2])).toMatchObject({
         email: 'reader@test.com',
      });
      expect(await fetchAuthor(token, `/tags/${s.tag.id}`, endpoints[4][2])).not.toHaveProperty(
         'email',
      );
   });
});
