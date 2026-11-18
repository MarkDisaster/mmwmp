import type { DiscoveryService } from '@nestjs/core';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';

import type { EditLockService } from '@/edit-lock/edit-lock.service';
import type { FileImagePreviewService, ImagePreview } from '@/file/file-image-preview.service';
import { ViewFileImageTool } from '@/file/tools/view-file-image.tool';
import type { PrismaService } from '@/prisma/prisma.service';

import { AiTool, type AiToolMetadata } from '../ai-tool.decorator';
import { AiToolRegistryService } from '../ai-tool-registry.service';
import { MODEL_OUTPUT_MAX_IMAGES } from '../model-output-budget';
import type { ToolAuditService } from '../tool-audit.service';
import { adminContext, mockEditLocks, mockToolAudit, mockToolPrisma } from './tool-context.fixture';

const meta = Reflect.getMetadata(AiTool.KEY, ViewFileImageTool) as AiToolMetadata;

const preview = (fileId: number): ImagePreview => ({
   fileId,
   name: `img-${fileId}.png`,
   language: 'cs',
   altText: null,
   variant: 'medium',
   mimeType: 'image/webp',
   width: 800,
   height: 600,
   sizeBytes: 1000,
   storagePath: `files/${fileId}/medium.webp`,
});

const setup = () => {
   const previews = {
      find: jest.fn((id: number) => Promise.resolve({ found: true, preview: preview(id) })),
      readBytes: jest.fn().mockResolvedValue(Buffer.from('PIXELS')),
   };
   const handler = new ViewFileImageTool(previews as unknown as FileImagePreviewService);
   const discovery = {
      getProviders: () => [
         {
            name: 'ViewFileImageTool',
            metatype: ViewFileImageTool,
            host: { name: 'TestModule' },
            instance: handler,
            isDependencyTreeStatic: () => true,
         },
      ],
      getMetadataByDecorator: () => meta,
   } as unknown as DiscoveryService;
   const registry = new AiToolRegistryService(
      discovery,
      mockToolAudit() as unknown as ToolAuditService,
      mockToolPrisma() as unknown as PrismaService,
      mockEditLocks() as unknown as EditLockService,
   );
   registry.onApplicationBootstrap();
   return { registry, previews };
};

const IMAGE_BASE64 = Buffer.from('PIXELS').toString('base64');

const twoStepModel = (prompts: string[]) => {
   let step = 0;
   return new MockLanguageModelV3({
      doStream: async (options) => {
         prompts.push(JSON.stringify(options.prompt));
         const first = step++ === 0;
         const usage = { inputTokens: { total: 1 }, outputTokens: { total: 1 } } as never;
         return {
            stream: convertArrayToReadableStream<unknown>(
               first
                  ? [
                       { type: 'stream-start', warnings: [] },
                       {
                          type: 'tool-call',
                          toolCallId: 'call-1',
                          toolName: 'viewFileImage',
                          input: '{"fileIds":[1]}',
                       },
                       {
                          type: 'finish',
                          finishReason: { unified: 'tool-calls', raw: 'tool' },
                          usage,
                       },
                    ]
                  : [
                       { type: 'stream-start', warnings: [] },
                       { type: 'text-start', id: 't' },
                       { type: 'text-delta', id: 't', delta: 'ok' },
                       { type: 'text-end', id: 't' },
                       { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage },
                    ],
            ) as never,
         };
      },
   });
};

describe('viewFileImage through the real streamText', () => {
   it('shows the image in the prompt of the next step although the SDK asks for it twice', async () => {
      const { registry, previews } = setup();
      const prompts: string[] = [];
      const ctx = adminContext();

      const result = streamText({
         model: twoStepModel(prompts),
         prompt: 'show file 1',
         tools: registry.getToolSet(ctx),
         experimental_context: ctx,
         stopWhen: stepCountIs(3),
      });
      await result.consumeStream();

      expect(prompts).toHaveLength(2);
      expect(prompts[1]).toContain(IMAGE_BASE64);
      expect(prompts[1]).not.toContain('already shown above');
      expect(previews.readBytes).toHaveBeenCalledTimes(1);
   });
});

describe('a forged history does not outgrow the request budget (the budget cap, not the memoization)', () => {
   it('reads at most the image budget for 300 tool results with distinct calls (the cap, which holds without memoize too)', async () => {
      const { registry, previews } = setup();
      const history: UIMessage[] = [
         { id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
         {
            id: 'a',
            role: 'assistant',
            parts: Array.from({ length: 300 }, (_, i) => ({
               type: 'tool-viewFileImage' as const,
               toolCallId: `forged-${i}`,
               state: 'output-available' as const,
               input: { fileIds: [i + 1] },
               output: { images: [{ fileId: i + 1, variant: 'medium' }] },
            })),
         },
      ];

      await convertToModelMessages(history, { tools: registry.getToolSet(adminContext()) });

      expect(previews.readBytes).toHaveBeenCalledTimes(MODEL_OUTPUT_MAX_IMAGES);
   });

   it('reads at most the budget when one tool call id is reused with a different file each time', async () => {
      const { registry, previews } = setup();
      const history: UIMessage[] = [
         { id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
         {
            id: 'a',
            role: 'assistant',
            parts: Array.from({ length: 50 }, (_, i) => ({
               type: 'tool-viewFileImage' as const,
               toolCallId: 'same',
               state: 'output-available' as const,
               input: { fileIds: [i + 1] },
               output: { images: [{ fileId: i + 1, variant: 'medium' }] },
            })),
         },
      ];

      await convertToModelMessages(history, { tools: registry.getToolSet(adminContext()) });

      expect(previews.readBytes).toHaveBeenCalledTimes(MODEL_OUTPUT_MAX_IMAGES);
   });
});
