import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import {
   describeManualOrder,
   manualOrderClient,
   type ManualOrderResource,
} from '../../setup/manual-order';
import { names, tagBody } from '../../setup/tags';
import { createAdminAndLogin } from '../../setup/users';

const tags: ManualOrderResource = {
   table: 'tags',
   createBody: (slug) => tagBody(slug, slug),
};

describe('Tag ordering (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectTag.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { name: 'viewer' } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   describeManualOrder(tags);

   const { create: createTag, place, publicSlugs } = manualOrderClient(tags);

   it('should return the tags in the new order from the public list', async () => {
      const token = await createAdminAndLogin();
      const a = await createTag(token, 'a');
      const b = await createTag(token, 'b');
      expect(await publicSlugs()).toEqual(['a', 'b']);

      await place(token, b.id, a.id, 'before');

      expect(await publicSlugs()).toEqual(['b', 'a']);
   });

   it('should set updatedAt when the tag is edited', async () => {
      const token = await createAdminAndLogin();
      const a = await createTag(token, 'a');
      const before = await prisma.tag.findUniqueOrThrow({ where: { id: a.id } });

      await getHttpServer()
         .patch(`/tags/${a.id}`)
         .set('Authorization', `Bearer ${token}`)
         .send({ translations: [{ language: 'cs', name: 'renamed' }] });

      const after = await prisma.tag.findUniqueOrThrow({ where: { id: a.id } });
      expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
   });

   it('should have no upper limit on the number of tags', async () => {
      const token = await createAdminAndLogin();
      for (let i = 0; i < 101; i++) {
         await prisma.tag.create({
            data: { translations: names(`t${i}`), slug: `t${i}`, sortOrder: i },
         });
      }

      const created = await createTag(token, 'extra');

      expect(created.sortOrder).toBe(101);
   });
});
