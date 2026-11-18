import type { ConfigService } from '@nestjs/config';
import { tool } from 'ai';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';

import type { AiInteractionService } from '@/ai/observability/ai-interaction.service';
import type { PromptRegistryService } from '@/ai/prompts/prompt-registry.service';
import { noPermissionContext } from '@/ai/tools/__tests__/tool-context.fixture';
import type { AiToolRegistryService } from '@/ai/tools/ai-tool-registry.service';

import { ChatService } from '../chat.service';

const usage = (input: number, output: number) => ({
   inputTokens: { total: input, noCache: input, cacheRead: 0, cacheWrite: 0 },
   outputTokens: { total: output, text: output, reasoning: 0 },
});

const stepStream = (n: number) =>
   n < 3
      ? convertArrayToReadableStream([
           {
              type: 'tool-call' as const,
              toolCallId: `call-${n}`,
              toolName: 'listTags',
              input: '{}',
           },
           {
              type: 'finish' as const,
              finishReason: { unified: 'tool-calls' as const, raw: 'tool_use' },
              usage: usage(10 * n, n),
           },
        ])
      : convertArrayToReadableStream([
           { type: 'text-start' as const, id: 't' },
           { type: 'text-delta' as const, id: 't', delta: 'Hotovo.' },
           { type: 'text-end' as const, id: 't' },
           {
              type: 'finish' as const,
              finishReason: { unified: 'stop' as const, raw: 'stop' },
              usage: usage(10 * n, n),
           },
        ]);

let step = 0;
const model = new MockLanguageModelV3({
   doStream: async () => {
      step += 1;
      return { stream: stepStream(step) };
   },
});

jest.mock('@ai-sdk/google', () => ({ google: jest.fn(() => model) }));
jest.mock('@ai-sdk/anthropic', () => ({ anthropic: jest.fn(() => model) }));

describe('ChatService.streamAgent — recorded usage', () => {
   it('records the tokens of every step of a turn, not only the last one', async () => {
      step = 0;
      const record = jest.fn().mockResolvedValue(undefined);
      const service = new ChatService(
         {
            get: jest.fn((key: string) => (key === 'LLM_PROVIDER' ? 'google' : undefined)),
         } as unknown as ConfigService,
         {
            has: jest.fn().mockReturnValue(true),
            render: jest.fn(() => 'persona'),
         } as unknown as PromptRegistryService,
         { record } as unknown as AiInteractionService,
         {
            getToolSet: () => ({
               listTags: tool({ inputSchema: z.object({}), execute: async () => [] }),
            }),
            getActiveToolNames: () => ['listTags'],
         } as unknown as AiToolRegistryService,
      );

      const result = await service.streamAgent(
         [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Kolik je štítků?' }] }],
         noPermissionContext(),
      );
      await result.consumeStream();

      expect(record).toHaveBeenCalledTimes(1);
      expect(record).toHaveBeenCalledWith(
         expect.objectContaining({
            inputTokens: 60,
            outputTokens: 6,
            totalTokens: 66,
            stepCount: 3,
            toolCallCount: 2,
            finishReason: 'stop',
         }),
      );
   });
});
