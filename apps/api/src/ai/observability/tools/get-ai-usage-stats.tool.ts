import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';

import { AiUsageService } from '../ai-usage.service';

const inputSchema = z.object({
   from: z
      .string()
      .datetime()
      .optional()
      .describe('ISO-8601 start of the window (inclusive), e.g. `2026-05-01T00:00:00.000Z`.'),
   to: z
      .string()
      .datetime()
      .optional()
      .describe('ISO-8601 end of the window (exclusive). Omit both for all time.'),
   userId: z.number().int().positive().optional().describe('Only the interactions of this user.'),
   recent: z
      .number()
      .int()
      .min(0)
      .max(TOOL_LIST_MAX_LIMIT)
      .optional()
      .describe('How many of the newest interactions to list besides the totals. Defaults to 0.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'getAiUsageStats',
   description:
      'AI (AURORA) usage over a time window: number of interactions, tokens, average latency ' +
      'and failed interactions. Admin role only. Optional `recent` adds the newest interactions ' +
      '(model, tokens, tool calls, error). Use for "kolik tokenů jsme spotřebovali". ' +
      'Turn "this month" into `from` / `to` yourself.',
   inputSchema,
   permission: 'admin',
   behavior: 'readonly',
})
@Injectable()
export class GetAiUsageStatsTool extends AiToolHandler<Input> {
   constructor(private readonly usage: AiUsageService) {
      super();
   }

   async execute(_ctx: ToolContext, { recent, ...window }: Input) {
      const summary = await this.usage.summary(window);
      if (!recent) return summary;

      const { items } = await this.usage.interactions({ ...window, page: 1, limit: recent });
      return {
         ...summary,
         recent: items.map((row) => ({
            id: row.id,
            createdAt: row.createdAt,
            userId: row.userId,
            provider: row.provider,
            model: row.model,
            totalTokens: row.totalTokens,
            latencyMs: row.latencyMs,
            toolCallCount: row.toolCallCount,
            error: row.error,
         })),
      };
   }
}
