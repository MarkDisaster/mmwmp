import { PrismaService } from '../../../src/prisma/prisma.service';
import { RevalidationService } from '../../../src/revalidation/revalidation.service';
import { waitForAuditCount } from '../../setup/audit';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin, createTestUser, loginAs } from '../../setup/users';

describe('POST /revalidation (e2e)', () => {
   let prisma: PrismaService;
   let token: string;
   let revalidateNow: jest.SpyInstance;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(async () => {
      await cleanupDb();
      revalidateNow = jest
         .spyOn(getApp().get(RevalidationService), 'revalidateNow')
         .mockImplementation((tags) =>
            Promise.resolve([...new Set(tags)].map((tag) => ({ tag, revalidated: true }))),
         );
      token = await createAdminAndLogin();
   });
   afterEach(() => revalidateNow.mockRestore());
   afterAll(cleanupDb);

   const post = (body: object, as: string | null = token) => {
      const request = getHttpServer().post('/revalidation');
      return (as ? request.set('Authorization', `Bearer ${as}`) : request).send(body);
   };

   it('refreshes the given tags, answers the result per tag and audits it', async () => {
      const response = await post({ tags: ['projects', 'tags'] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
         results: [
            { tag: 'projects', revalidated: true },
            { tag: 'tags', revalidated: true },
         ],
      });
      expect(revalidateNow).toHaveBeenCalledWith(['projects', 'tags']);
      expect(await waitForAuditCount(prisma, { action: 'website.revalidate' })).toBe(1);
   });

   it('reports a tag the web refused, with the reason', async () => {
      revalidateNow.mockResolvedValueOnce([
         { tag: 'contact', revalidated: false, reason: 'the web answered 401' },
      ]);

      const response = await post({ tags: ['contact'] });

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual([
         { tag: 'contact', revalidated: false, reason: 'the web answered 401' },
      ]);
   });

   it('answers 401 without a token', async () => {
      expect((await post({ tags: ['projects'] }, null)).status).toBe(401);
      expect(revalidateNow).not.toHaveBeenCalled();
   });

   it('answers 403 without the publish permission of projects (an editor can only update)', async () => {
      await createTestUser({ email: 'editor@test.com', role: 'editor' });

      const response = await post({ tags: ['projects'] }, await loginAs('editor@test.com'));

      expect(response.status).toBe(403);
      expect(revalidateNow).not.toHaveBeenCalled();
   });

   it('lets a role with projects.publish refresh the web', async () => {
      const role = await prisma.role.create({
         data: {
            name: 'projects-publisher',
            permissions: { create: [{ resource: 'projects', action: 'publish' }] },
         },
      });
      await createTestUser({ email: 'publisher@test.com', role: role.name });

      const response = await post({ tags: ['services'] }, await loginAs('publisher@test.com'));

      expect(response.status).toBe(200);
   });

   it.each([
      ['no body', {}],
      ['an empty list', { tags: [] }],
      ['an unknown tag', { tags: ['everything'] }],
      ['a repeated tag', { tags: ['projects', 'projects'] }],
      ['more tags than exist', { tags: ['projects', 'services', 'contact', 'tags', 'projects'] }],
      ['a tag that is not a string', { tags: [1] }],
      ['tags that are not a list', { tags: 'projects' }],
   ])('rejects %s with 400 and calls nothing', async (_name, body) => {
      expect((await post(body)).status).toBe(400);
      expect(revalidateNow).not.toHaveBeenCalled();
   });
});
