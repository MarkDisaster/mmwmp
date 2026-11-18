import IORedis from 'ioredis';

import { EDIT_LOCK_TTL_SECONDS } from '../../../src/edit-lock/edit-lock.constants';
import { EditLockService } from '../../../src/edit-lock/edit-lock.service';
import { EditLockEntity } from '../../../src/edit-lock/enum/edit-lock-entity.enum';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../../../src/redis/redis.module';
import { getApp, getHttpServer } from '../../setup/init';
import { createTestUser, loginAs } from '../../setup/users';

const TAB_A = 'tab-aaaaaaaa';
const TAB_B = 'tab-bbbbbbbb';
const URL = '/edit-locks/projects/5';

describe('Edit locks (e2e)', () => {
   let jana: string;
   let petr: string;
   let editor: string;

   beforeEach(async () => {
      const prisma = getApp().get(PrismaService);
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
      const [janaUser, petrUser, editorUser] = await Promise.all([
         createTestUser({ email: 'jana@test.com', firstName: 'Jana', lastName: 'Nováková' }),
         createTestUser({ email: 'petr@test.com', firstName: 'Petr', lastName: 'Svoboda' }),
         createTestUser({ email: 'editor@test.com', role: 'editor' }),
      ]);
      [jana, petr, editor] = await Promise.all(
         [janaUser, petrUser, editorUser].map(({ email }) => loginAs(email)),
      );
   });

   afterAll(async () => {
      const prisma = getApp().get(PrismaService);
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   });

   const as = (token: string) => ({
      acquire: (sessionId: string, takeOver?: boolean, url = URL) =>
         getHttpServer()
            .put(url)
            .set('Authorization', `Bearer ${token}`)
            .send({ sessionId, takeOver }),
      release: (sessionId: string, url = URL) =>
         getHttpServer().delete(url).set('Authorization', `Bearer ${token}`).send({ sessionId }),
      find: (sessionId?: string, url = URL) =>
         getHttpServer()
            .get(url)
            .query(sessionId ? { sessionId } : {})
            .set('Authorization', `Bearer ${token}`),
   });

   it('takes a free lock and renews it without changing its start', async () => {
      const first = await as(jana).acquire(TAB_A);
      expect(first.status).toBe(200);
      expect(first.body).toEqual({
         heldBy: { userId: expect.any(Number), name: 'Jana Nováková', since: expect.any(String) },
         mine: true,
      });

      const redis = getApp().get<IORedis>(REDIS_CLIENT);
      expect(await redis.ttl('edit-lock:projects:5')).toBeGreaterThan(60);
      expect(await redis.ttl('edit-lock:projects:5')).toBeLessThanOrEqual(EDIT_LOCK_TTL_SECONDS);

      await redis.pexpire('edit-lock:projects:5', 5_000);
      const again = await as(jana).acquire(TAB_A);
      expect(again.body.heldBy.since).toBe(first.body.heldBy.since);
      expect(again.body.mine).toBe(true);
      expect(await redis.ttl('edit-lock:projects:5')).toBeGreaterThan(EDIT_LOCK_TTL_SECONDS - 5);
   });

   it('tells another user who holds the lock without taking it', async () => {
      await as(jana).acquire(TAB_A);

      const response = await as(petr).acquire(TAB_B);

      expect(response.status).toBe(200);
      expect(response.body.mine).toBe(false);
      expect(response.body.heldBy.name).toBe('Jana Nováková');
      expect((await as(jana).find(TAB_A)).body.mine).toBe(true);
   });

   it('does not let another tab of the same user take the lock', async () => {
      await as(jana).acquire(TAB_A);

      const response = await as(jana).acquire(TAB_B);

      expect(response.body.mine).toBe(false);
      expect(response.body.heldBy.name).toBe('Jana Nováková');
   });

   it('moves the lock on takeOver, and the previous holder sees the new one', async () => {
      await as(jana).acquire(TAB_A);

      const taken = await as(petr).acquire(TAB_B, true);
      expect(taken.body).toMatchObject({ mine: true, heldBy: { name: 'Petr Svoboda' } });

      const heartbeat = await as(jana).acquire(TAB_A);
      expect(heartbeat.body).toMatchObject({ mine: false, heldBy: { name: 'Petr Svoboda' } });
   });

   it('expires without a heartbeat', async () => {
      await as(jana).acquire(TAB_A);
      const redis = getApp().get<IORedis>(REDIS_CLIENT);
      await redis.pexpire('edit-lock:projects:5', 100);
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect((await as(petr).find()).body).toEqual({ heldBy: null, mine: false });
      expect((await as(petr).acquire(TAB_B)).body.mine).toBe(true);
   });

   it('releases only the lock of the session that sends the request', async () => {
      await as(jana).acquire(TAB_A);

      expect((await as(petr).release(TAB_B)).status).toBe(204);
      expect((await as(jana).release(TAB_B)).status).toBe(204);
      expect((await as(jana).find()).body.heldBy).not.toBeNull();

      expect((await as(jana).release(TAB_A)).status).toBe(204);
      expect((await as(jana).find()).body.heldBy).toBeNull();
   });

   it('lets exactly one of concurrent first requests win', async () => {
      const sessions = Array.from({ length: 10 }, (_, i) => `tab-concurrent-${i}`);
      const responses = await Promise.all(
         sessions.map((sessionId, i) => as(i % 2 ? jana : petr).acquire(sessionId)),
      );

      expect(responses.filter(({ body }) => body.mine)).toHaveLength(1);
      const holders = new Set(responses.map(({ body }) => body.heldBy.name));
      expect(holders.size).toBe(1);
   });

   it('does not let another user act under the tab id of the lock holder', async () => {
      await as(jana).acquire(TAB_A);

      const renew = await as(petr).acquire(TAB_A);
      expect(renew.body).toMatchObject({ mine: false, heldBy: { name: 'Jana Nováková' } });
      const redis = getApp().get<IORedis>(REDIS_CLIENT);
      await redis.pexpire('edit-lock:projects:5', 2_000);
      await as(petr).acquire(TAB_A);
      expect(await redis.pttl('edit-lock:projects:5')).toBeLessThanOrEqual(2_000);

      expect((await as(petr).release(TAB_A)).status).toBe(204);
      expect((await as(jana).find(TAB_A)).body).toMatchObject({ mine: true });
      expect((await as(petr).find(TAB_A)).body.mine).toBe(false);

      const taken = await as(petr).acquire(TAB_A, true);
      expect(taken.body).toMatchObject({ mine: true, heldBy: { name: 'Petr Svoboda' } });
      expect((await as(jana).acquire(TAB_A)).body.mine).toBe(false);
   });

   it('locks the contact under id 0 and rejects a negative or a non-numeric id', async () => {
      expect((await as(jana).acquire(TAB_A, false, '/edit-locks/contact/0')).body.mine).toBe(true);
      expect((await as(jana).acquire(TAB_A, false, '/edit-locks/projects/-1')).status).toBe(400);
      expect((await as(jana).acquire(TAB_A, false, '/edit-locks/projects/abc')).status).toBe(400);
      expect((await as(jana).find(TAB_A, '/edit-locks/projects/1.5')).status).toBe(400);
   });

   it('keeps the locks of different records apart', async () => {
      await as(jana).acquire(TAB_A);

      expect((await as(petr).acquire(TAB_B, false, '/edit-locks/projects/6')).body.mine).toBe(true);
      expect((await as(petr).acquire(TAB_B, false, '/edit-locks/services/5')).body.mine).toBe(true);
   });

   it('keeps the lock under the key prefix of the deployment', async () => {
      const shared = getApp().get<IORedis>(REDIS_CLIENT);
      const prefixed = new IORedis({
         host: shared.options.host,
         port: shared.options.port,
         keyPrefix: 'staging:',
      });
      try {
         const service = new EditLockService(prefixed);
         const state = await service.acquire(
            EditLockEntity.projects,
            5,
            { id: 1, name: 'Jana' },
            TAB_A,
            false,
         );

         expect(state.mine).toBe(true);
         expect(await shared.exists('staging:edit-lock:projects:5')).toBe(1);
         expect(await shared.exists('edit-lock:projects:5')).toBe(0);
         await service.release(EditLockEntity.projects, 5, 1, TAB_A);
         expect(await shared.exists('staging:edit-lock:projects:5')).toBe(0);
      } finally {
         prefixed.disconnect();
      }
   });

   it('requires the update permission of the entity', async () => {
      expect((await as(editor).acquire(TAB_A)).status).toBe(200);
      for (const response of [
         await as(editor).acquire(TAB_A, false, '/edit-locks/contact/0'),
         await as(editor).release(TAB_A, '/edit-locks/contact/0'),
         await as(editor).find(TAB_A, '/edit-locks/contact/0'),
      ]) {
         expect(response.status).toBe(403);
      }
   });

   it('rejects a request without a token, an unknown entity and a bad body', async () => {
      expect((await getHttpServer().put(URL).send({ sessionId: TAB_A })).status).toBe(401);
      expect((await as(jana).acquire(TAB_A, false, '/edit-locks/users/5')).status).toBe(400);
      expect((await as(jana).acquire('x')).status).toBe(400);
   });

   it('answers 503 when the store is down, the editor keeps working without locks', async () => {
      const redis = getApp().get<IORedis>(REDIS_CLIENT);
      const spy = jest
         .spyOn(redis as never, 'editLockAcquire' as never)
         .mockRejectedValue(new Error('connection lost') as never);
      try {
         expect((await as(jana).acquire(TAB_A)).status).toBe(503);
      } finally {
         spy.mockRestore();
      }
   });
});
