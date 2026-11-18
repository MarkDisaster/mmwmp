import { EventEmitter } from 'node:events';

import type { ConfigService } from '@nestjs/config';
import { pipeUIMessageStreamToResponse } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import type { Request, Response } from 'express';

import type { AiInteractionService } from '@/ai/observability/ai-interaction.service';
import type { PromptRegistryService } from '@/ai/prompts/prompt-registry.service';
import type { AiToolRegistryService } from '@/ai/tools/ai-tool-registry.service';
import type { AuthenticatedUser } from '@/common/guards/auth.guard';

import { ChatController } from '../chat.controller';
import { ChatService } from '../chat.service';
import type { ChatRateLimitService } from '../chat-rate-limit.service';
import type { ConversationService } from '../conversation.service';
import type { StreamChatBodyDto } from '../dto/stream-chat.dto';
import type { PageContextService } from '../page-context.service';

jest.mock('ai', () => ({
   ...jest.requireActual('ai'),
   pipeUIMessageStreamToResponse: jest.fn(),
}));

const model = new MockLanguageModelV3({
   doStream: async ({ abortSignal }) => ({
      stream: new ReadableStream({
         start(controller) {
            controller.enqueue({ type: 'text-start', id: 't' });
            for (let i = 0; i < 100; i += 1) {
               controller.enqueue({ type: 'text-delta', id: 't', delta: `${i} ` });
            }
            abortSignal?.addEventListener('abort', () => controller.error(abortSignal.reason));
         },
      }),
   }),
});

jest.mock('@ai-sdk/google', () => ({ google: jest.fn(() => model) }));

const user = { id: 7, role: { isAdmin: true, permissions: [] } } as unknown as AuthenticatedUser;

const until = async (condition: () => boolean) => {
   for (let i = 0; i < 200 && !condition(); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
   }
};

describe('ChatController.stream — usage of a turn after a disconnect', () => {
   it('records the turn when the client stops reading and goes away', async () => {
      const record = jest.fn().mockResolvedValue(undefined);
      const chat = new ChatService(
         {
            get: jest.fn((key: string) => (key === 'LLM_PROVIDER' ? 'google' : undefined)),
         } as unknown as ConfigService,
         {
            has: jest.fn().mockReturnValue(true),
            render: jest.fn().mockReturnValue('You are AURORA.'),
         } as unknown as PromptRegistryService,
         { record } as unknown as AiInteractionService,
         {
            getToolSet: () => ({}),
            getActiveToolNames: () => [],
         } as unknown as AiToolRegistryService,
      );
      const controller = new ChatController(
         chat,
         {
            findByIdForUser: jest.fn().mockResolvedValue({}),
            findHistory: jest.fn().mockResolvedValue([]),
            addMessage: jest.fn().mockResolvedValue(undefined),
            saveResponse: jest.fn().mockResolvedValue(undefined),
         } as unknown as ConversationService,
         {
            assertWithinLimit: jest.fn().mockResolvedValue(undefined),
         } as unknown as ChatRateLimitService,
         { resolve: jest.fn().mockResolvedValue(null) } as unknown as PageContextService,
      );
      const res = Object.assign(new EventEmitter(), { writableFinished: false });

      await controller.stream(
         user,
         'conv-1',
         {
            messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Ahoj' }] }],
         } as unknown as StreamChatBodyDto,
         { ip: '1.2.3.4', headers: {} } as unknown as Request,
         res as unknown as Response,
      );
      await until(() => model.doStreamCalls.length === 1);

      const [{ stream }] = jest.mocked(pipeUIMessageStreamToResponse).mock.calls[0] as [
         { stream: ReadableStream },
      ];
      await stream.cancel();
      res.emit('close');
      await until(() => record.mock.calls.length > 0);

      expect(record).toHaveBeenCalledTimes(1);
      expect(record).toHaveBeenCalledWith(
         expect.objectContaining({ conversationId: 'conv-1', finishReason: 'aborted' }),
      );
   });
});
