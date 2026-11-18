import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { tool } from 'ai';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import type { Request, Response } from 'express';
import { z } from 'zod';

import type { AiInteractionService } from '@/ai/observability/ai-interaction.service';
import type { PromptRegistryService } from '@/ai/prompts/prompt-registry.service';
import { contextWithGrants } from '@/ai/tools/__tests__/tool-context.fixture';
import type { AiToolRegistryService } from '@/ai/tools/ai-tool-registry.service';
import type { AuthenticatedUser } from '@/common/guards/auth.guard';

import { ChatController } from '../chat.controller';
import { ChatService } from '../chat.service';
import type { ChatRateLimitService } from '../chat-rate-limit.service';
import type { ConversationService } from '../conversation.service';
import type { StreamChatBodyDto } from '../dto/stream-chat.dto';
import type { PageContextService } from '../page-context.service';

const finish = (unified: 'tool-calls' | 'stop') => ({
   type: 'finish' as const,
   finishReason: { unified, raw: unified },
   usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
   },
});

let offeredTools: string[][] = [];
let step = 0;
const model = new MockLanguageModelV3({
   doStream: async ({ tools }) => {
      offeredTools.push((tools ?? []).map(({ name }) => name).sort());
      step += 1;
      return {
         stream:
            step === 1
               ? convertArrayToReadableStream([
                    {
                       type: 'tool-call' as const,
                       toolCallId: 'call-1',
                       toolName: 'deleteUser',
                       input: '{"id":1}',
                    },
                    finish('tool-calls'),
                 ])
               : convertArrayToReadableStream([
                    { type: 'text-start' as const, id: 't' },
                    { type: 'text-delta' as const, id: 't', delta: 'Nelze.' },
                    { type: 'text-end' as const, id: 't' },
                    finish('stop'),
                 ]),
      };
   },
});

jest.mock('@ai-sdk/google', () => ({ google: jest.fn(() => model) }));
jest.mock('@ai-sdk/anthropic', () => ({ anthropic: jest.fn(() => model) }));

const userMessage = {
   id: 'm1',
   role: 'user' as const,
   parts: [{ type: 'text' as const, text: 'Ahoj' }],
};

const serviceWith = (prompt: { has: boolean; text?: string }) => {
   const deleteUser = jest.fn(async () => ({ deleted: true }));
   const getActiveToolNames = jest.fn(() => ['listTags']);
   const service = new ChatService(
      {
         get: jest.fn((key: string) => (key === 'LLM_PROVIDER' ? 'google' : undefined)),
      } as unknown as ConfigService,
      {
         has: jest.fn(() => prompt.has),
         render: jest.fn(() => prompt.text ?? ''),
      } as unknown as PromptRegistryService,
      { record: jest.fn().mockResolvedValue(undefined) } as unknown as AiInteractionService,
      {
         getToolSet: () => ({
            listTags: tool({ inputSchema: z.object({}), execute: async () => [] }),
            deleteUser: tool({ inputSchema: z.object({ id: z.number() }), execute: deleteUser }),
         }),
         getActiveToolNames,
      } as unknown as AiToolRegistryService,
   );
   return { service, deleteUser, getActiveToolNames };
};

beforeEach(() => {
   offeredTools = [];
   step = 0;
});

describe('ChatService.streamAgent — tools filtered by the permissions of the user', () => {
   it('offers the model only the tools the role may call and runs no other one', async () => {
      const { service, deleteUser, getActiveToolNames } = serviceWith({
         has: true,
         text: 'You are AURORA.',
      });
      const context = contextWithGrants([{ resource: 'tags', action: 'read' }]);

      const result = await service.streamAgent([userMessage], context);
      await result.consumeStream();

      expect(getActiveToolNames).toHaveBeenCalledWith(context);
      expect(offeredTools).toEqual([['listTags'], ['listTags']]);
      expect(deleteUser).not.toHaveBeenCalled();
      const [firstStep] = await result.steps;
      expect(firstStep?.content).toEqual(
         expect.arrayContaining([
            expect.objectContaining({ type: 'tool-error', toolName: 'deleteUser' }),
         ]),
      );
   });
});

describe('ChatService — no chat without the persona prompt', () => {
   it.each([
      ['missing', { has: false }],
      ['empty', { has: true, text: '' }],
      ['only whitespace', { has: true, text: ' \n\t' }],
   ])('refuses when the prompt is %s, before any model call', async (_label, prompt) => {
      const { service } = serviceWith(prompt);

      expect(() => service.assertAvailable()).toThrow(ServiceUnavailableException);
      await expect(
         service.streamAgent([userMessage], contextWithGrants([])),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(offeredTools).toEqual([]);
   });

   it('runs with the persona prompt as the system prompt', async () => {
      const { service } = serviceWith({ has: true, text: 'You are AURORA.' });

      expect(() => service.assertAvailable()).not.toThrow();
      const result = await service.streamAgent([userMessage], contextWithGrants([]));
      await result.consumeStream();

      expect(model.doStreamCalls.at(-1)?.prompt[0]).toMatchObject({
         role: 'system',
         content: 'You are AURORA.',
      });
   });
});

describe('ChatService.onApplicationBootstrap — persona prompt check', () => {
   it('logs an error for a missing prompt and lets the application start', () => {
      const { service } = serviceWith({ has: false });
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      error.mockClear();

      expect(() => service.onApplicationBootstrap()).not.toThrow();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('aurora-admin'));
      error.mockRestore();
   });

   it('logs nothing when the prompt is there', () => {
      const { service } = serviceWith({ has: true, text: 'You are AURORA.' });
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      error.mockClear();

      service.onApplicationBootstrap();

      expect(error).not.toHaveBeenCalled();
      error.mockRestore();
   });
});

describe('ChatController.stream — no chat without the persona prompt', () => {
   it('answers 503 before it counts, stores or streams the turn', async () => {
      const conversations = {
         findByIdForUser: jest.fn().mockResolvedValue({}),
         findHistory: jest.fn().mockResolvedValue([]),
         addMessage: jest.fn(),
         replaceMessage: jest.fn(),
      };
      const rateLimit = { assertWithinLimit: jest.fn() };
      const streamAgent = jest.fn();
      const controller = new ChatController(
         {
            assertAvailable: () => {
               throw new ServiceUnavailableException();
            },
            streamAgent,
         } as unknown as ChatService,
         conversations as unknown as ConversationService,
         rateLimit as unknown as ChatRateLimitService,
         { resolve: jest.fn() } as unknown as PageContextService,
      );

      await expect(
         controller.stream(
            { id: 7, role: { isAdmin: true, permissions: [] } } as unknown as AuthenticatedUser,
            'conv-1',
            { messages: [userMessage] } as unknown as StreamChatBodyDto,
            { headers: {} } as Request,
            { once: jest.fn() } as unknown as Response,
         ),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(rateLimit.assertWithinLimit).not.toHaveBeenCalled();
      expect(conversations.findHistory).not.toHaveBeenCalled();
      expect(conversations.addMessage).not.toHaveBeenCalled();
      expect(streamAgent).not.toHaveBeenCalled();
   });
});
