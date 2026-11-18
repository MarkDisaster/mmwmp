import type IORedis from 'ioredis';

import { CHAT_RATE_LIMITS, chatTurnKey } from '../../../src/chat/chat-rate-limit.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../../../src/redis/redis.module';
import { getApp, getHttpServer } from '../../setup/init';
import { createTestUser, loginAs } from '../../setup/users';

describe('Chat rate limit (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.message.deleteMany();
      await prisma.conversation.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany({ where: { name: 'nobody' } });
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   it('should answer 429 to a user over the limit, also for a role without permissions', async () => {
      await prisma.role.create({ data: { name: 'nobody' } });
      const user = await createTestUser({ email: 'nobody@test.com', role: 'nobody' });
      const token = await loginAs('nobody@test.com');
      const conversation = await getHttpServer()
         .post('/chat/conversations')
         .set('Authorization', `Bearer ${token}`)
         .send({});
      expect(conversation.status).toBe(201);

      const [minute] = CHAT_RATE_LIMITS;
      await getApp()
         .get<IORedis>(REDIS_CLIENT)
         .set(chatTurnKey(minute.window, user.id), minute.limit, 'EX', minute.windowSeconds);

      const response = await getHttpServer()
         .post(`/chat/conversations/${conversation.body.id}/stream`)
         .set('Authorization', `Bearer ${token}`)
         .send({ messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] }] });

      expect(response.status).toBe(429);
      expect(response.body.retryAfterSeconds).toBeGreaterThan(0);
      expect(await prisma.message.count()).toBe(0);
   });

   it('should answer 404 for a conversation of another user before counting', async () => {
      await createTestUser({ email: 'owner@test.com', role: 'editor' });
      const other = await createTestUser({ email: 'other@test.com', role: 'editor' });
      const ownerToken = await loginAs('owner@test.com');
      const otherToken = await loginAs('other@test.com');
      const conversation = await getHttpServer()
         .post('/chat/conversations')
         .set('Authorization', `Bearer ${ownerToken}`)
         .send({})
         .expect(201);

      const stream = await getHttpServer()
         .post(`/chat/conversations/${conversation.body.id}/stream`)
         .set('Authorization', `Bearer ${otherToken}`)
         .send({ messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] }] });
      const messages = await getHttpServer()
         .get(`/chat/conversations/${conversation.body.id}/messages`)
         .set('Authorization', `Bearer ${otherToken}`);

      expect(stream.status).toBe(404);
      expect(messages.status).toBe(404);
      const [minute] = CHAT_RATE_LIMITS;
      expect(
         await getApp().get<IORedis>(REDIS_CLIENT).get(chatTurnKey(minute.window, other.id)),
      ).toBeNull();
   });
});
