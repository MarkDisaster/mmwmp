import { Prisma } from '../../prisma/generated/prisma/client';
import type { MovePosition } from '../../src/common/sort/move-positions';
import { ORDER_LABELS, type OrderedTable } from '../../src/common/sort/ordered-table';
import { PrismaService } from '../../src/prisma/prisma.service';
import { getApp, getHttpServer } from './init';
import { waitForBlockedAdvisoryLock } from './locks';
import { createAdminAndLogin, createTestUser, loginAs } from './users';

export type ManualOrderResource = {
   table: OrderedTable;
   createBody: (slug: string) => object;
};

type StoredRow = { id: number; slug: string; sortOrder: number; updatedAt: number };

const prisma = () => getApp().get(PrismaService);

export const manualOrderClient = ({ table, createBody }: ManualOrderResource) => {
   const create = async (token: string, slug: string) => {
      const response = await getHttpServer()
         .post(`/${table}`)
         .set('Authorization', `Bearer ${token}`)
         .send(createBody(slug));
      expect(response.status).toBe(201);
      return response.body as { id: number; sortOrder: number };
   };

   const move = (token: string, id: number, body: object) =>
      getHttpServer()
         .post(`/${table}/${id}/move`)
         .set('Authorization', `Bearer ${token}`)
         .send(body);

   const place = (token: string, id: number, targetId: number, position: MovePosition) =>
      move(token, id, { targetId, position });

   const rows = () =>
      prisma().$queryRaw<StoredRow[]>(
         Prisma.sql`SELECT id, slug, sort_order AS "sortOrder",
               (EXTRACT(EPOCH FROM updated_at) * 1000)::float8 AS "updatedAt"
               FROM ${Prisma.raw(table)} ORDER BY sort_order, id`,
      );

   const stored = async () => (await rows()).map((row) => [row.slug, row.sortOrder]);

   const adminSlugs = async (token: string) => {
      const response = await getHttpServer()
         .get(`/${table}`)
         .set('Authorization', `Bearer ${token}`);
      return response.body.data.map((row: { slug: string }) => row.slug);
   };

   const publish = async (token: string, id: number) => {
      const response = await getHttpServer()
         .patch(`/${table}/${id}/status`)
         .set('Authorization', `Bearer ${token}`)
         .send({ status: 'published' });
      expect(response.status).toBe(200);
   };

   const publicSlugs = async () => {
      const response = await getHttpServer().get(`/public/${table}`);
      return response.body.data.map((row: { slug: string }) => row.slug);
   };

   return { create, move, place, rows, stored, adminSlugs, publish, publicSlugs };
};

const databaseNow = async () => {
   const [{ now }] = await prisma().$queryRaw<{ now: number }[]>`
      SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::float8 AS now`;
   return now;
};

export const describeManualOrder = (resource: ManualOrderResource) => {
   const { table } = resource;
   const label = ORDER_LABELS[table];
   const noun = label.toLowerCase();
   const { create, move, place, rows, stored, adminSlugs } = manualOrderClient(resource);

   const holdOrderLock = (tx: Prisma.TransactionClient) =>
      tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`${table}.sort_order`}))`);

   describe(`POST /${table}/:id/move`, () => {
      it(`should move a ${noun} down, after the target`, async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');
         await create(token, 'b');
         const c = await create(token, 'c');
         await create(token, 'd');

         const response = await place(token, a.id, c.id, 'after');

         expect(response.status).toBe(204);
         expect(await stored()).toEqual([
            ['b', 0],
            ['c', 1],
            ['a', 2],
            ['d', 3],
         ]);
      });

      it(`should move a ${noun} up, before the target`, async () => {
         const token = await createAdminAndLogin();
         await create(token, 'a');
         const b = await create(token, 'b');
         await create(token, 'c');
         const d = await create(token, 'd');

         const response = await place(token, d.id, b.id, 'before');

         expect(response.status).toBe(204);
         expect(await stored()).toEqual([
            ['a', 0],
            ['d', 1],
            ['b', 2],
            ['c', 3],
         ]);
      });

      it(`should make a ${noun} the first and the last one`, async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');
         const b = await create(token, 'b');
         const c = await create(token, 'c');

         await place(token, c.id, a.id, 'before');
         expect(await stored()).toEqual([
            ['c', 0],
            ['a', 1],
            ['b', 2],
         ]);

         await place(token, c.id, b.id, 'after');
         expect(await stored()).toEqual([
            ['a', 0],
            ['b', 1],
            ['c', 2],
         ]);
      });

      it(`should return the ${table} in the new order from the admin list`, async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');
         await create(token, 'b');
         const c = await create(token, 'c');

         await place(token, c.id, a.id, 'before');

         expect(await adminSlugs(token)).toEqual(['c', 'a', 'b']);
      });

      it(`should set updatedAt of the moved ${table} to the time of the move, in UTC`, async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');
         const b = await create(token, 'b');
         const start = Math.floor(await databaseNow());

         const response = await place(token, b.id, a.id, 'before');

         const end = Math.ceil(await databaseNow());
         expect(response.status).toBe(204);
         const moved = (await rows()).map(({ slug, updatedAt }) => ({
            slug,
            inMove: updatedAt >= start && updatedAt <= end,
         }));
         expect(moved).toEqual([
            { slug: 'b', inMove: true },
            { slug: 'a', inMove: true },
         ]);
      });

      it(`should leave updatedAt of the ${table} that did not move untouched`, async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');
         const b = await create(token, 'b');
         await create(token, 'c');
         const before = await rows();

         const response = await place(token, b.id, a.id, 'before');

         expect(response.status).toBe(204);
         const after = await rows();
         expect(after.find((row) => row.slug === 'c')?.updatedAt).toEqual(
            before.find((row) => row.slug === 'c')?.updatedAt,
         );
      });

      it('should accept a move that changes nothing without writing anything', async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');
         const b = await create(token, 'b');
         const before = await rows();

         const response = await place(token, b.id, a.id, 'after');

         expect(response.status).toBe(204);
         expect(await rows()).toEqual(before);
      });

      it(`should repair ${table} that share a sort order`, async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');
         await create(token, 'b');
         const c = await create(token, 'c');
         await prisma().$executeRaw(Prisma.sql`UPDATE ${Prisma.raw(table)} SET sort_order = 0`);

         const response = await place(token, c.id, a.id, 'before');

         expect(response.status).toBe(204);
         expect(await stored()).toEqual([
            ['c', 0],
            ['a', 1],
            ['b', 2],
         ]);
      });

      it('should keep a clean 0..n-1 order after overlapping moves', async () => {
         const token = await createAdminAndLogin();
         const created = [];
         for (const slug of ['a', 'b', 'c', 'd', 'e']) created.push(await create(token, slug));
         const [a, b, c, d, e] = created;

         const responses = await Promise.all([
            place(token, a.id, e.id, 'after'),
            place(token, e.id, b.id, 'before'),
            place(token, c.id, d.id, 'after'),
            place(token, d.id, a.id, 'before'),
         ]);

         expect(responses.map((r) => r.status)).toEqual([204, 204, 204, 204]);
         const after = await rows();
         expect(after.map((row) => row.sortOrder)).toEqual([0, 1, 2, 3, 4]);
         expect(new Set(after.map((row) => row.id)).size).toBe(5);
      });

      it('should make a move wait while another transaction holds the order lock', async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');
         await create(token, 'b');
         const c = await create(token, 'c');
         let pending: Promise<{ status: number }> | undefined;

         await prisma().$transaction(async (tx) => {
            await holdOrderLock(tx);
            pending = place(token, c.id, a.id, 'before').then((response) => response);
            await waitForBlockedAdvisoryLock(prisma());

            expect(await stored()).toEqual([
               ['a', 0],
               ['b', 1],
               ['c', 2],
            ]);
         });

         expect((await pending)?.status).toBe(204);
         expect(await stored()).toEqual([
            ['c', 0],
            ['a', 1],
            ['b', 2],
         ]);
      });

      it(`should reject a ${noun} next to itself`, async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');

         const response = await place(token, a.id, a.id, 'after');

         expect(response.status).toBe(400);
         expect(response.body.message).toBe(`A ${noun} cannot be placed next to itself`);
      });

      it('should reject an unknown target and write nothing', async () => {
         const token = await createAdminAndLogin();
         await create(token, 'a');
         const b = await create(token, 'b');

         const response = await place(token, b.id, 999999, 'before');

         expect(response.status).toBe(400);
         expect(response.body.message).toBe(`${label} 999999 does not exist`);
         expect(await stored()).toEqual([
            ['a', 0],
            ['b', 1],
         ]);
      });

      it(`should return 404 for an unknown ${noun}`, async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');

         const response = await place(token, 999999, a.id, 'before');

         expect(response.status).toBe(404);
      });

      it.each([
         [{ targetId: 1 }, 'position must be one of the following values: before, after'],
         [
            { targetId: 1, position: 'first' },
            'position must be one of the following values: before, after',
         ],
         [{ position: 'after' }, 'targetId must be an integer number'],
         [{ targetId: 1.5, position: 'after' }, 'targetId must be an integer number'],
         [{ targetId: 0, position: 'after' }, 'targetId must not be less than 1'],
      ])('should reject the invalid body %j', async (body, message) => {
         const token = await createAdminAndLogin();

         const response = await move(token, 999999, body);

         expect(response.status).toBe(400);
         expect(response.body.message).toEqual(expect.arrayContaining([message]));
      });

      it(`should let the editor role reorder ${table}`, async () => {
         const adminToken = await createAdminAndLogin();
         const a = await create(adminToken, 'a');
         const b = await create(adminToken, 'b');
         await createTestUser({ email: 'editor@test.com', role: 'editor' });
         const editorToken = await loginAs('editor@test.com');

         const response = await place(editorToken, b.id, a.id, 'before');

         expect(response.status).toBe(204);
         expect(await stored()).toEqual([
            ['b', 0],
            ['a', 1],
         ]);
      });

      it(`should return 403 for a role without the right to update ${table}`, async () => {
         const adminToken = await createAdminAndLogin();
         const a = await create(adminToken, 'a');
         const b = await create(adminToken, 'b');
         await prisma().role.create({ data: { name: 'viewer' } });
         await createTestUser({ email: 'viewer@test.com', role: 'viewer' });
         const viewerToken = await loginAs('viewer@test.com');

         const response = await place(viewerToken, b.id, a.id, 'before');

         expect(response.status).toBe(403);
         expect(await stored()).toEqual([
            ['a', 0],
            ['b', 1],
         ]);
      });

      it('should return 401 without auth', async () => {
         const response = await getHttpServer()
            .post(`/${table}/1/move`)
            .send({ targetId: 2, position: 'after' });

         expect(response.status).toBe(401);
      });
   });

   describe(`Order of a new ${noun}`, () => {
      it(`should put a new ${noun} at the end of the manual order`, async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');
         const b = await create(token, 'b');
         await place(token, b.id, a.id, 'before');

         const created = await create(token, 'c');

         expect(created.sortOrder).toBe(2);
         expect(await adminSlugs(token)).toEqual(['b', 'a', 'c']);
      });

      it(`should start the order at 0 for the first ${noun}`, async () => {
         const token = await createAdminAndLogin();

         const first = await create(token, 'first');

         expect(first.sortOrder).toBe(0);
      });

      it(`should give ${table} created at the same time different positions`, async () => {
         const token = await createAdminAndLogin();
         await create(token, 'first');

         await Promise.all(['a', 'b', 'c'].map((slug) => create(token, slug)));

         expect((await rows()).map((row) => row.sortOrder)).toEqual([0, 1, 2, 3]);
      });

      it(`should make a new ${noun} wait while another transaction holds the order lock`, async () => {
         const token = await createAdminAndLogin();
         await create(token, 'a');
         let pending: ReturnType<typeof create> | undefined;

         await prisma().$transaction(async (tx) => {
            await holdOrderLock(tx);
            pending = create(token, 'b');
            await waitForBlockedAdvisoryLock(prisma());

            expect(await stored()).toEqual([['a', 0]]);
         });

         expect((await pending)?.sortOrder).toBe(1);
      });

      it('should not let PATCH write the order', async () => {
         const token = await createAdminAndLogin();
         const a = await create(token, 'a');
         await create(token, 'b');

         await getHttpServer()
            .patch(`/${table}/${a.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ sortOrder: 5 });

         expect(await stored()).toEqual([
            ['a', 0],
            ['b', 1],
         ]);
      });
   });
};

export const describePublishedOrder = (resource: ManualOrderResource) => {
   const { create, place, publish, publicSlugs } = manualOrderClient(resource);

   it('should refresh the cached public list after a move', async () => {
      const token = await createAdminAndLogin();
      const a = await create(token, 'a');
      const b = await create(token, 'b');
      await publish(token, a.id);
      await publish(token, b.id);
      expect(await publicSlugs()).toEqual(['a', 'b']);

      await place(token, b.id, a.id, 'before');

      expect(await publicSlugs()).toEqual(['b', 'a']);
   });
};
