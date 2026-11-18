import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { GOOGLE_MODEL_ID } from '../../../src/ai/models';
import { AiInteractionService } from '../../../src/ai/observability/ai-interaction.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin } from '../../setup/users';

const COST = /cost/i;

describe('AI observability without cost (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.aiInteraction.deleteMany();
      await prisma.conversation.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const setup = async () => {
      const token = await createAdminAndLogin();
      const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
      const conversation = await prisma.conversation.create({ data: { userId: admin.id } });
      return { token, userId: admin.id, conversationId: conversation.id };
   };

   const insertRowWithCost = (conversationId: string, userId: number) =>
      prisma.$executeRaw`
         INSERT INTO ai_interactions (conversation_id, user_id, provider, model, input_tokens,
            output_tokens, total_tokens, input_cost_cents, output_cost_cents, total_cost_cents,
            latency_ms)
         VALUES (${conversationId}, ${userId}, 'google', ${GOOGLE_MODEL_ID}, 100, 50, 150, 1.5, 4.5,
            6, 700)`;

   const get = (token: string, path: string) =>
      getHttpServer().get(`/ai/observability/${path}`).set('Authorization', `Bearer ${token}`);

   it('should record a turn without computing its cost', async () => {
      const { userId, conversationId } = await setup();

      await getApp().get(AiInteractionService).record({
         conversationId,
         userId,
         provider: 'google',
         model: GOOGLE_MODEL_ID,
         inputTokens: 1_000_000,
         outputTokens: 1_000_000,
         totalTokens: 2_000_000,
         latencyMs: 900,
         toolCallCount: 0,
         stepCount: 1,
      });

      const rows = await prisma.$queryRaw<{ input: string; output: string; total: string }[]>`
         SELECT input_cost_cents::text AS input, output_cost_cents::text AS output,
            total_cost_cents::text AS total
         FROM ai_interactions`;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ input: '0.000000', output: '0.000000', total: '0.000000' });
   });

   it('should answer the summary with usage only', async () => {
      const { token, userId, conversationId } = await setup();
      await insertRowWithCost(conversationId, userId);

      const response = await get(token, 'summary');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
         interactionCount: 1,
         totalTokens: 150,
         avgLatencyMs: 700,
         errorCount: 0,
      });
   });

   it('should list interactions without the cost a row still holds', async () => {
      const { token, userId, conversationId } = await setup();
      await insertRowWithCost(conversationId, userId);

      const response = await get(token, 'interactions');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toEqual(expect.objectContaining({ totalTokens: 150 }));
      expect(Object.keys(response.body.items[0]).filter((key) => COST.test(key))).toEqual([]);
   });

   it('should document no cost in the observability endpoints', () => {
      const document = SwaggerModule.createDocument(getApp(), new DocumentBuilder().build());

      expect(JSON.stringify(document.paths['/ai/observability/summary'])).not.toMatch(COST);
      expect(JSON.stringify(document.paths['/ai/observability/interactions'])).not.toMatch(COST);
   });
});
