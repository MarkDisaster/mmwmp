import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';

import type { AiUsageService } from '../../ai-usage.service';
import { GetAiUsageStatsTool } from '../get-ai-usage-stats.tool';

const meta = Reflect.getMetadata(AiTool.KEY, GetAiUsageStatsTool) as AiToolMetadata;

describe('GetAiUsageStatsTool', () => {
   const summary = {
      interactionCount: 3,
      totalTokens: 900,
      avgLatencyMs: 800,
      errorCount: 1,
   };
   let usage: { summary: jest.Mock; interactions: jest.Mock };
   let tool: GetAiUsageStatsTool;

   beforeEach(() => {
      usage = {
         summary: jest.fn().mockResolvedValue(summary),
         interactions: jest.fn().mockResolvedValue({
            items: [
               {
                  id: 1,
                  createdAt: new Date('2026-05-01T00:00:00Z'),
                  userId: 2,
                  conversationId: 'c-1',
                  provider: 'google',
                  model: 'gemini',
                  totalTokens: 300,
                  latencyMs: 700,
                  toolCallCount: 2,
                  error: null,
               },
            ],
         }),
      };
      tool = new GetAiUsageStatsTool(usage as unknown as AiUsageService);
   });

   it('is admin-only (AdminGuard) and read-only', () => {
      expect(meta.permission).toBe('admin');
      expect(meta.behavior).toBe('readonly');
   });

   it('answers the totals of the window', async () => {
      const result = await tool.execute(adminContext(), { from: '2026-05-01T00:00:00.000Z' });

      expect(usage.summary).toHaveBeenCalledWith({ from: '2026-05-01T00:00:00.000Z' });
      expect(result).toEqual(summary);
      expect(usage.interactions).not.toHaveBeenCalled();
   });

   it('adds the newest interactions without the conversation id and without a cost', async () => {
      const result = (await tool.execute(adminContext(), { recent: 1 })) as {
         recent: Record<string, unknown>[];
      };

      expect(usage.interactions).toHaveBeenCalledWith({ page: 1, limit: 1 });
      expect(result.recent).toEqual([
         expect.objectContaining({ id: 1, model: 'gemini', totalTokens: 300 }),
      ]);
      expect(result.recent[0]).not.toHaveProperty('conversationId');
      expect(Object.keys(result.recent[0]).filter((key) => /cost/i.test(key))).toEqual([]);
   });

   it('describes usage without a cost to the model', () => {
      expect(meta.description).not.toMatch(/cost|price|stojí/i);
   });

   it('caps the number of listed interactions', () => {
      expect(meta.inputSchema.safeParse({ recent: TOOL_LIST_MAX_LIMIT + 1 }).success).toBe(false);
      expect(meta.inputSchema.safeParse({ from: 'last month' }).success).toBe(false);
   });
});
