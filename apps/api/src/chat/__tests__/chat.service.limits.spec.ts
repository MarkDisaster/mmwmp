import type { ConfigService } from '@nestjs/config';
import { tool } from 'ai';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';

import type { AiInteractionService } from '@/ai/observability/ai-interaction.service';
import type { PromptRegistryService } from '@/ai/prompts/prompt-registry.service';
import { noPermissionContext } from '@/ai/tools/__tests__/tool-context.fixture';
import type { AiToolRegistryService } from '@/ai/tools/ai-tool-registry.service';

import { ChatService } from '../chat.service';

const PERSONA = 'You are AURORA.';

const toolCallStep = () =>
   convertArrayToReadableStream([
      { type: 'tool-call' as const, toolCallId: 'call-1', toolName: 'listTags', input: '{}' },
      {
         type: 'finish' as const,
         finishReason: { unified: 'tool-calls' as const, raw: 'tool_use' },
         usage: {
            inputTokens: { total: 10, noCache: 0, cacheRead: 4, cacheWrite: 6 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
         },
      },
   ]);

const stalledStep = (signal: AbortSignal | undefined) =>
   new ReadableStream({
      start(controller) {
         signal?.addEventListener('abort', () => controller.error(signal.reason));
      },
   });

let model: MockLanguageModelV3;
const anthropicRequests: Array<Record<string, unknown>> = [];

jest.mock('@ai-sdk/google', () => ({ google: jest.fn(() => model) }));
jest.mock('@ai-sdk/anthropic', () => {
   const actual = jest.requireActual<typeof import('@ai-sdk/anthropic')>('@ai-sdk/anthropic');
   const provider = actual.createAnthropic({
      apiKey: 'test',
      fetch: async (_url, init) => {
         anthropicRequests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
         return new Response('{}', { status: 500 });
      },
   });
   return { ...actual, anthropic: (id: string) => provider(id) };
});

const createService = (env: Record<string, unknown> = {}) => {
   const record = jest.fn().mockResolvedValue(undefined);
   const service = new ChatService(
      {
         get: jest.fn((key: string) => ({ LLM_PROVIDER: 'google', ...env })[key]),
      } as unknown as ConfigService,
      {
         has: jest.fn().mockReturnValue(true),
         render: jest.fn().mockReturnValue(PERSONA),
      } as unknown as PromptRegistryService,
      { record } as unknown as AiInteractionService,
      {
         getToolSet: () => ({
            listTags: tool({ inputSchema: z.object({}), execute: async () => [] }),
         }),
         getActiveToolNames: () => ['listTags'],
      } as unknown as AiToolRegistryService,
   );
   return { service, record };
};

const secondCall = async () => {
   while (model.doStreamCalls.length < 2) await new Promise((resolve) => setTimeout(resolve, 5));
};

const userMessage = [
   { id: 'm1', role: 'user' as const, parts: [{ type: 'text' as const, text: 'Ahoj' }] },
];

describe('ChatService.streamAgent — limits', () => {
   beforeEach(() => {
      let step = 0;
      model = new MockLanguageModelV3({
         doStream: async ({ abortSignal }) => {
            step += 1;
            return { stream: step === 1 ? toolCallStep() : stalledStep(abortSignal) };
         },
      });
      anthropicRequests.length = 0;
   });

   it('caps the output of every model call at 16 384 tokens by default', async () => {
      const controller = new AbortController();
      const result = await createService().service.streamAgent(
         userMessage,
         noPermissionContext(),
         null,
         controller.signal,
      );
      const consumed = result.consumeStream();
      await secondCall();
      controller.abort();
      await consumed;

      expect(model.doStreamCalls).toHaveLength(2);
      expect(model.doStreamCalls.map((call) => call.maxOutputTokens)).toEqual([16_384, 16_384]);
   });

   it('takes the output cap from AI_CHAT_MAX_OUTPUT_TOKENS', async () => {
      const controller = new AbortController();
      controller.abort();
      const { service } = createService({ AI_CHAT_MAX_OUTPUT_TOKENS: 4096 });

      await (
         await service.streamAgent(userMessage, noPermissionContext(), null, controller.signal)
      ).consumeStream();

      expect(model.doStreamCalls[0]?.maxOutputTokens).toBe(4096);
   });

   it('aborts the model call with the signal of the caller and records the finished steps', async () => {
      const controller = new AbortController();
      const { service, record } = createService();
      const result = await service.streamAgent(
         userMessage,
         noPermissionContext(),
         null,
         controller.signal,
      );
      const consumed = result.consumeStream();
      await secondCall();

      const callSignal = model.doStreamCalls[1]?.abortSignal;
      expect(callSignal?.aborted).toBe(false);
      controller.abort();
      await consumed;

      expect(callSignal?.aborted).toBe(true);
      expect(record).toHaveBeenCalledTimes(1);
      expect(record).toHaveBeenCalledWith(
         expect.objectContaining({
            inputTokens: 10,
            outputTokens: 1,
            cacheReadTokens: 4,
            cacheWriteTokens: 6,
            stepCount: 1,
            toolCallCount: 1,
            finishReason: 'aborted',
         }),
      );
   });

   it('records the prompt cache tokens of a finished turn', async () => {
      model = new MockLanguageModelV3({
         doStream: async () => ({
            stream: convertArrayToReadableStream([
               { type: 'text-start' as const, id: 't' },
               { type: 'text-delta' as const, id: 't', delta: 'Hotovo.' },
               { type: 'text-end' as const, id: 't' },
               {
                  type: 'finish' as const,
                  finishReason: { unified: 'stop' as const, raw: 'end_turn' },
                  usage: {
                     inputTokens: { total: 30, noCache: 2, cacheRead: 25, cacheWrite: 3 },
                     outputTokens: { total: 2, text: 2, reasoning: 0 },
                  },
               },
            ]),
         }),
      });
      const { service, record } = createService();

      await (await service.streamAgent(userMessage, noPermissionContext())).consumeStream();

      expect(record).toHaveBeenCalledWith(
         expect.objectContaining({
            inputTokens: 30,
            cacheReadTokens: 25,
            cacheWriteTokens: 3,
            finishReason: 'stop',
         }),
      );
   });

   it('ends a turn that runs longer than AI_CHAT_TURN_TIMEOUT_MS', async () => {
      const { service, record } = createService({ AI_CHAT_TURN_TIMEOUT_MS: 100 });

      await (await service.streamAgent(userMessage, noPermissionContext())).consumeStream();

      expect(model.doStreamCalls[1]?.abortSignal?.aborted).toBe(true);
      expect(record).toHaveBeenCalledWith(expect.objectContaining({ finishReason: 'aborted' }));
   });

   it('marks the persona prompt, after the tools, as an Anthropic cache breakpoint', async () => {
      const { service } = createService({ LLM_PROVIDER: 'anthropic' });

      await (
         await service.streamAgent(userMessage, noPermissionContext(), {
            kind: 'page',
            route: '/projects',
         })
      ).consumeStream();

      const body = anthropicRequests[0] as {
         system: Array<{ text: string; cache_control?: unknown }>;
         tools: Array<{ name: string; cache_control?: unknown }>;
         max_tokens: number;
      };
      expect(body.system[0]).toEqual({
         type: 'text',
         text: PERSONA,
         cache_control: { type: 'ephemeral' },
      });
      expect(body.system[1]?.text.startsWith('## Current admin page')).toBe(true);
      expect(body.system[1]?.cache_control).toBeUndefined();
      expect(body.tools.map((t) => t.name)).toEqual(['listTags']);
      expect(body.max_tokens).toBe(16_384);
   });
});
