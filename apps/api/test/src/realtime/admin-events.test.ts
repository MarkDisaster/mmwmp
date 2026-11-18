import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { getOptionsToken } from '@nestjs/throttler';

import { AppModule } from '../../../src/app.module';
import { TokenType } from '../../../src/auth/enum/token-type.enum';
import { passwordFingerprint } from '../../../src/auth/password-fingerprint';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { MAX_STREAMS_PER_USER } from '../../../src/realtime/admin-events.constants';
import { StorageService } from '../../../src/storage/storage.service';
import { StorageTestService } from '../../../src/storage/storage.test-service';
import { getApp, getHttpServer } from '../../setup/init';
import { closeAllEventStreams, openEventStream } from '../../setup/sse';
import { tagBody } from '../../setup/tags';
import { createTestUser, loginAs } from '../../setup/users';

const settle = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Admin events (e2e)', () => {
   let admin: string;
   let nobody: string;
   let url: string;

   const cleanup = async () => {
      const prisma = getApp().get(PrismaService);
      await prisma.tagTranslation.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { name: 'nobody' } });
   };

   beforeEach(async () => {
      await cleanup();
      const prisma = getApp().get(PrismaService);
      await prisma.role.create({ data: { name: 'nobody' } });
      await createTestUser({ email: 'admin@test.com' });
      await createTestUser({ email: 'nobody@test.com', role: 'nobody' });
      [admin, nobody] = await Promise.all([loginAs('admin@test.com'), loginAs('nobody@test.com')]);
      url = `${await getApp().getUrl()}/admin/events`;
   });

   afterEach(closeAllEventStreams);

   afterAll(cleanup);

   const createTag = (token: string, slug = 'react') =>
      getHttpServer()
         .post('/tags')
         .set('Authorization', `Bearer ${token}`)
         .send(tagBody(slug, 'React'));

   it('is an event stream that no proxy may buffer, and needs a token', async () => {
      const anonymous = await openEventStream(url);
      expect(anonymous.status).toBe(401);
      await anonymous.close();

      const stream = await openEventStream(url, admin);
      expect(stream.status).toBe(200);
      expect(stream.headers.get('content-type')).toContain('text/event-stream');
      expect(stream.headers.get('x-accel-buffering')).toBe('no');
      expect(stream.headers.get('cache-control')).toContain('no-cache');
      await stream.close();
   });

   it('tells the open admin about a create, an update and a delete of a record', async () => {
      const stream = await openEventStream(url, admin);

      const created = await createTag(admin);
      expect(await stream.nextChange(0)).toEqual({
         entity: 'tags',
         id: created.body.id,
         action: 'created',
         version: 0,
      });

      await getHttpServer()
         .patch(`/tags/${created.body.id}`)
         .set('Authorization', `Bearer ${admin}`)
         .send({ color: '#ff0000', version: 0 })
         .expect(200);
      expect(await stream.nextChange(1)).toEqual({
         entity: 'tags',
         id: created.body.id,
         action: 'updated',
         version: 1,
      });

      await getHttpServer()
         .delete(`/tags/${created.body.id}`)
         .set('Authorization', `Bearer ${admin}`)
         .expect(204);
      expect(await stream.nextChange(2)).toMatchObject({ action: 'deleted', version: 2 });

      await getHttpServer()
         .delete(`/tags/${created.body.id}/permanent`)
         .set('Authorization', `Bearer ${admin}`)
         .expect(204);
      expect(await stream.nextChange(3)).toMatchObject({ action: 'deleted', version: null });

      await stream.close();
   });

   it('carries no data of the record', async () => {
      const stream = await openEventStream(url, admin);

      await createTag(admin, 'secret-slug');
      await stream.nextChange(0);

      expect(Object.keys(stream.changes()[0]).sort()).toEqual([
         'action',
         'entity',
         'id',
         'version',
      ]);
      expect(JSON.stringify(stream.messages)).not.toContain('secret-slug');
      await stream.close();
   });

   it('publishes after the commit: the record read the moment the event arrives has that version', async () => {
      const stream = await openEventStream(url, admin);
      const created = await createTag(admin);
      await stream.nextChange(0);

      const update = getHttpServer()
         .patch(`/tags/${created.body.id}`)
         .set('Authorization', `Bearer ${admin}`)
         .send({ color: '#00ff00', version: 0 })
         .then((response) => response);
      const event = await stream.nextChange(1);
      const read = await getHttpServer()
         .get(`/tags/${created.body.id}`)
         .set('Authorization', `Bearer ${admin}`);
      await update;

      expect(read.body.version).toBe(event.version);
      await stream.close();
   });

   it('publishes nothing for a write that failed', async () => {
      const stream = await openEventStream(url, admin);
      const created = await createTag(admin);
      await stream.nextChange(0);

      await getHttpServer()
         .patch(`/tags/${created.body.id}`)
         .set('Authorization', `Bearer ${admin}`)
         .send({ color: '#0000ff', version: 7 })
         .expect(409);
      await getHttpServer()
         .patch(`/tags/${created.body.id}`)
         .set('Authorization', `Bearer ${admin}`)
         .send({ color: '#0000ff', version: 0 })
         .expect(200);

      expect(await stream.nextChange(1)).toMatchObject({ action: 'updated', version: 1 });
      expect(stream.changes()).toHaveLength(2);
      await stream.close();
   });

   it('does not tell a user who may not read the entity', async () => {
      const allowed = await openEventStream(url, admin);
      const forbidden = await openEventStream(url, nobody);

      await createTag(admin);
      await allowed.nextChange(0);
      await settle();

      expect(forbidden.status).toBe(200);
      expect(forbidden.changes()).toEqual([]);
      await Promise.all([allowed.close(), forbidden.close()]);
   });

   it(`refuses the ${MAX_STREAMS_PER_USER + 1}th stream of a user`, async () => {
      const streams = await Promise.all(
         Array.from({ length: MAX_STREAMS_PER_USER }, () => openEventStream(url, admin)),
      );
      expect(streams.every(({ status }) => status === 200)).toBe(true);

      const refused = await openEventStream(url, admin);
      expect(refused.status).toBe(429);

      await Promise.all([refused, ...streams].map((stream) => stream.close()));
      await settle();
      const again = await openEventStream(url, admin);
      expect(again.status).toBe(200);
      await again.close();
   });

   it('ends the stream when the access token expires', async () => {
      const prisma = getApp().get(PrismaService);
      const user = await prisma.user.findUniqueOrThrow({
         where: { email: 'admin@test.com' },
         include: { auth: true },
      });
      const secret = process.env.JWT_SECRET as string;
      const token = getApp()
         .get(JwtService)
         .sign(
            {
               sub: user.id,
               type: TokenType.ACCESS,
               sh: passwordFingerprint(secret, 'session', user.auth?.password ?? ''),
            },
            { secret, expiresIn: 2 },
         );
      const stream = await openEventStream(url, token);
      expect(stream.status).toBe(200);

      await stream.waitUntilEnded();
      await stream.close();
   });

   describe('with two instances of the API on one Redis', () => {
      let second: NestExpressApplication;
      let secondUrl: string;

      beforeEach(async () => {
         const module = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(StorageService)
            .useClass(StorageTestService)
            .overrideProvider(getOptionsToken())
            .useValue([{ ttl: 60_000, limit: 10_000 }])
            .compile();
         second = module.createNestApplication<NestExpressApplication>();
         await second.listen(0, '127.0.0.1');
         secondUrl = `${await second.getUrl()}/admin/events`;
      });

      afterEach(async () => {
         await closeAllEventStreams();
         await second?.close();
      });

      it('delivers a write of one instance to the clients of both, once each', async () => {
         const onFirst = await openEventStream(url, admin);
         const onSecond = await openEventStream(secondUrl, admin);
         await settle(500);

         const created = await createTag(admin);

         expect(await onFirst.nextChange(0)).toMatchObject({ id: created.body.id });
         expect(await onSecond.nextChange(0)).toMatchObject({ id: created.body.id });
         await settle();
         expect(onFirst.changes()).toHaveLength(1);
         expect(onSecond.changes()).toHaveLength(1);
         await Promise.all([onFirst.close(), onSecond.close()]);
      });

      it('ends the streams of an instance that shuts down, so the clients reconnect', async () => {
         const stream = await openEventStream(secondUrl, admin);

         await second.close();

         await stream.waitUntilEnded();
         await stream.close();
      });
   });

   describe('with another deployment on the same Redis', () => {
      let other: NestExpressApplication;
      let otherUrl: string;

      beforeEach(async () => {
         process.env.REDIS_KEY_PREFIX = 'other';
         try {
            const module = await Test.createTestingModule({ imports: [AppModule] })
               .overrideProvider(StorageService)
               .useClass(StorageTestService)
               .overrideProvider(getOptionsToken())
               .useValue([{ ttl: 60_000, limit: 10_000 }])
               .compile();
            other = module.createNestApplication<NestExpressApplication>();
            await other.listen(0, '127.0.0.1');
         } finally {
            delete process.env.REDIS_KEY_PREFIX;
         }
         otherUrl = await other.getUrl();
      });

      afterEach(async () => {
         await closeAllEventStreams();
         await other?.close();
      });

      it('does not exchange events with it (staging and production may share a Valkey)', async () => {
         const here = await openEventStream(url, admin);
         const there = await openEventStream(`${otherUrl}/admin/events`, admin);
         await settle(500);

         await createTag(admin, 'ours');
         await here.nextChange(0);
         await fetch(`${otherUrl}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` },
            body: JSON.stringify(tagBody('theirs', 'Theirs')),
         });
         await there.nextChange(0);
         await settle();

         expect(here.changes()).toHaveLength(1);
         expect(there.changes()).toHaveLength(1);
         await Promise.all([here.close(), there.close()]);
      });
   });
});
