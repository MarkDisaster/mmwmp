import type { DiscoveryService } from '@nestjs/core';
import { convertToModelMessages, type ToolSet, type UIMessage } from 'ai';
import { z } from 'zod';

import type { EditLockService } from '@/edit-lock/edit-lock.service';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import type { PrismaService } from '@/prisma/prisma.service';

import { AiToolHandler, type ToolModelOutput } from '../ai-tool.decorator';
import { AiToolRegistryService, type RegisteredAiTool } from '../ai-tool-registry.service';
import { ModelOutputBudget } from '../model-output-budget';
import type { ToolAuditService } from '../tool-audit.service';
import type { ToolContext } from '../tool-auth';
import { adminContext, mockEditLocks, mockToolAudit, mockToolPrisma } from './tool-context.fixture';

const META = {
   name: 'showPicture',
   description: 'Shows a picture.',
   inputSchema: z.object({ id: z.number() }),
   permission: { resource: PermissionResource.files, action: PermissionAction.read },
   behavior: 'readonly' as const,
};

const IMAGE: ToolModelOutput = {
   type: 'content',
   value: [
      { type: 'text', text: 'File 1' },
      { type: 'image-data', data: 'QUJD', mediaType: 'image/webp' },
   ],
};

class PictureHandler extends AiToolHandler {
   execute = jest.fn().mockResolvedValue({ images: [{ fileId: 1 }] });
   toModelOutput = jest.fn(
      (_ctx: ToolContext | null, _output: unknown, _budget: ModelOutputBudget) =>
         Promise.resolve(IMAGE),
   );
}

class PlainHandler extends AiToolHandler {
   execute = jest.fn().mockResolvedValue({ ok: true });
}

const build = (handler: AiToolHandler, context?: ToolContext, active = true) => {
   const registered: RegisteredAiTool = {
      meta: META,
      behavior: 'readonly',
      handler,
      source: 'Test/Handler',
   };
   return AiToolRegistryService.buildSdkTool(
      registered,
      mockToolAudit() as unknown as ToolAuditService,
      mockToolPrisma(active) as unknown as PrismaService,
      context,
   );
};

describe('AiToolRegistryService — toModelOutput of a tool', () => {
   it('hands the handler the request context and the stored output', async () => {
      const handler = new PictureHandler();
      const ctx = adminContext();

      const sdkTool = build(handler, ctx);
      const result = await sdkTool.toModelOutput?.({
         toolCallId: 'c1',
         input: { id: 1 },
         output: { images: [{ fileId: 1 }] },
      });

      expect(result).toBe(IMAGE);
      expect(handler.toModelOutput).toHaveBeenCalledWith(
         ctx,
         { images: [{ fileId: 1 }] },
         expect.any(ModelOutputBudget),
      );
   });

   it('computes the result once per tool call id, however often the SDK asks for it', async () => {
      const handler = new PictureHandler();
      const sdkTool = build(handler, adminContext());
      const ask = (toolCallId: string) =>
         sdkTool.toModelOutput?.({ toolCallId, input: {}, output: {} });

      const first = await ask('call-1');
      const again = await ask('call-1');
      await ask('call-2');

      expect(again).toBe(first);
      expect(handler.toModelOutput).toHaveBeenCalledTimes(2);
   });

   it('gives the handler the caller as stored now, and none when the account is gone', async () => {
      const handler = new PictureHandler();

      await build(handler, adminContext(), false).toModelOutput?.({
         toolCallId: 'c1',
         input: {},
         output: {},
      });

      expect(handler.toModelOutput).toHaveBeenCalledWith(null, {}, expect.any(ModelOutputBudget));
   });

   it('does not give a reused call id the result of another output', async () => {
      const handler = new PictureHandler();
      handler.toModelOutput
         .mockResolvedValueOnce({ type: 'text', value: 'first' })
         .mockResolvedValueOnce({ type: 'text', value: 'second' });
      const sdkTool = build(handler, adminContext());
      const ask = (output: unknown) =>
         sdkTool.toModelOutput?.({ toolCallId: 'reused', input: {}, output });

      const first = await ask({ images: [{ fileId: 1 }] });
      const second = await ask({ images: [{ fileId: 2 }] });
      const repeat = await ask({ images: [{ fileId: 1 }] });

      expect(first).toEqual({ type: 'text', value: 'first' });
      expect(second).toEqual({ type: 'text', value: 'second' });
      expect(repeat).toBe(first);
      expect(handler.toModelOutput).toHaveBeenCalledTimes(2);
   });

   it('passes null when the tool set was built without a request context', async () => {
      const handler = new PictureHandler();

      await build(handler).toModelOutput?.({ toolCallId: 'c1', input: {}, output: {} });

      expect(handler.toModelOutput).toHaveBeenCalledWith(null, {}, expect.any(ModelOutputBudget));
   });

   it('leaves a tool without its own conversion alone (the SDK sends JSON)', () => {
      expect(build(new PlainHandler()).toModelOutput).toBeUndefined();
   });

   it('reaches the model as an image part when the history is converted with the same tools', async () => {
      const handler = new PictureHandler();
      const tools = { showPicture: build(handler, adminContext()) } as ToolSet;
      const history: UIMessage[] = [
         { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'show it' }] },
         {
            id: 'a1',
            role: 'assistant',
            parts: [
               {
                  type: 'tool-showPicture',
                  toolCallId: 'c1',
                  state: 'output-available',
                  input: { id: 1 },
                  output: { images: [{ fileId: 1 }] },
               },
            ],
         },
      ];

      const withTools = await convertToModelMessages(history, { tools });
      const withoutTools = await convertToModelMessages(history);

      const outputOf = (messages: Awaited<ReturnType<typeof convertToModelMessages>>) =>
         messages.flatMap((message) =>
            message.role === 'tool'
               ? message.content.flatMap((part) =>
                    part.type === 'tool-result' ? [part.output] : [],
                 )
               : [],
         );
      expect(outputOf(withTools)).toEqual([IMAGE]);
      expect(outputOf(withoutTools)).toEqual([
         { type: 'json', value: { images: [{ fileId: 1 }] } },
      ]);
   });

   describe('the media budget of a request', () => {
      const registryWith = (handler: AiToolHandler) => {
         const wrapper = {
            name: 'PictureHandler',
            metatype: PictureHandler,
            host: { name: 'TestModule' },
            instance: handler,
            isDependencyTreeStatic: () => true,
         };
         const discovery = {
            getProviders: () => [wrapper],
            getMetadataByDecorator: () => META,
         } as unknown as DiscoveryService;
         const registry = new AiToolRegistryService(
            discovery,
            mockToolAudit() as unknown as ToolAuditService,
            mockToolPrisma() as unknown as PrismaService,
            mockEditLocks() as unknown as EditLockService,
         );
         registry.onApplicationBootstrap();
         return registry;
      };
      const callOf = (toolSet: ToolSet, toolCallId: string) =>
         (
            toolSet.showPicture as unknown as {
               toModelOutput: (o: {
                  toolCallId: string;
                  input: unknown;
                  output: unknown;
               }) => unknown;
            }
         ).toModelOutput({ toolCallId, input: {}, output: {} });

      it('is one budget for all the tool results of a request and a new one per request', async () => {
         const handler = new PictureHandler();
         const registry = registryWith(handler);

         const first = registry.getToolSet(adminContext());
         await callOf(first, 'a');
         await callOf(first, 'b');
         const second = registry.getToolSet(adminContext());
         await callOf(second, 'a');

         const budgets = handler.toModelOutput.mock.calls.map((call) => call[2]);
         expect(budgets[0]).toBeInstanceOf(ModelOutputBudget);
         expect(budgets[1]).toBe(budgets[0]);
         expect(budgets[2]).not.toBe(budgets[0]);
      });
   });
});

describe('ModelOutputBudget', () => {
   it('grants each image once, up to the limit, and reports a repeat as a duplicate', () => {
      const budget = new ModelOutputBudget(2, 100);

      expect(budget.takeImage('a')).toBe('granted');
      expect(budget.takeImage('a')).toBe('duplicate');
      expect(budget.takeImage('b')).toBe('granted');
      expect(budget.takeImage('c')).toBe('exhausted');
   });

   it('reserves bytes up to the limit and refuses what does not fit', () => {
      const budget = new ModelOutputBudget(10, 100);

      expect(budget.takeBytes(60)).toBe(true);
      expect(budget.takeBytes(60)).toBe(false);
      expect(budget.takeBytes(40)).toBe(true);
   });
});
