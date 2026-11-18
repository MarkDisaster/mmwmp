import { EventEmitter } from 'node:events';

import type { Request, Response } from 'express';

import type { AuthenticatedUser } from '@/common/guards/auth.guard';

import { ChatController } from '../chat.controller';
import type { ChatService } from '../chat.service';
import type { ChatRateLimitService } from '../chat-rate-limit.service';
import type { ConversationService } from '../conversation.service';
import type { StreamChatBodyDto } from '../dto/stream-chat.dto';
import type { PageContextService, ResolvedPageContext } from '../page-context.service';

jest.mock('ai', () => ({
   ...jest.requireActual('ai'),
   pipeUIMessageStreamToResponse: jest.fn(),
}));

const user = {
   id: 7,
   role: { isAdmin: false, permissions: [{ resource: 'projects', action: 'read', id: 1 }] },
   passwordHash: 'must-not-travel',
} as unknown as AuthenticatedUser;

const userMessage = { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] };

const resolved: ResolvedPageContext = { kind: 'entity', entity: 'project', id: 12, title: 'X' };

const setup = () => {
   const resolve = jest.fn().mockResolvedValue(resolved);
   const streamAgent = jest.fn().mockResolvedValue({
      toUIMessageStream: jest.fn(),
      consumeStream: jest.fn().mockResolvedValue(undefined),
   });
   const controller = new ChatController(
      { streamAgent, assertAvailable: jest.fn() } as unknown as ChatService,
      {
         findByIdForUser: jest.fn().mockResolvedValue({}),
         findHistory: jest.fn().mockResolvedValue([]),
         addMessage: jest.fn().mockResolvedValue(undefined),
      } as unknown as ConversationService,
      {
         assertWithinLimit: jest.fn().mockResolvedValue(undefined),
      } as unknown as ChatRateLimitService,
      { resolve } as unknown as PageContextService,
   );
   const res = Object.assign(new EventEmitter(), { writableFinished: false });
   const call = (body: Partial<StreamChatBodyDto>) =>
      controller.stream(
         user,
         'conv-1',
         { messages: [userMessage], ...body } as StreamChatBodyDto,
         { ip: '1.2.3.4', headers: {} } as unknown as Request,
         res as unknown as Response,
      );
   const signalOf = () => streamAgent.mock.calls[0]?.[3] as AbortSignal;
   return { resolve, streamAgent, call, res, signalOf };
};

describe('ChatController.stream — page context', () => {
   it('resolves the page path with the same actor the tools get and passes the result on', async () => {
      const { resolve, streamAgent, call } = setup();

      await call({ pageContext: { path: '/projects/12' } });

      expect(resolve).toHaveBeenCalledTimes(1);
      const [actor, path] = resolve.mock.calls[0] as [unknown, unknown];
      expect(path).toBe('/projects/12');
      expect(actor).toEqual({
         id: 7,
         role: { isAdmin: false, permissions: [{ resource: 'projects', action: 'read' }] },
      });

      const [, toolContext, page] = streamAgent.mock.calls[0] as [
         unknown,
         { user: unknown },
         unknown,
      ];
      expect(toolContext.user).toBe(actor);
      expect(page).toBe(resolved);
   });

   it('passes an undefined path when the body has no page context', async () => {
      const { resolve, call } = setup();

      await call({});

      expect(resolve).toHaveBeenCalledWith(expect.anything(), undefined);
   });
});

describe('ChatController.stream — client disconnect', () => {
   it('aborts the turn when the response closes before it finished', async () => {
      const { call, res, signalOf } = setup();
      await call({});

      expect(signalOf().aborted).toBe(false);
      res.emit('close');
      expect(signalOf().aborted).toBe(true);
   });

   it('leaves a finished response alone', async () => {
      const { call, res, signalOf } = setup();
      await call({});

      res.writableFinished = true;
      res.emit('close');
      expect(signalOf().aborted).toBe(false);
   });
});
