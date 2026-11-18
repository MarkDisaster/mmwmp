import { adminContext, contextWithGrants } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { FileService } from '../../file.service';
import { UpdateFilesTool } from '../update-files.tool';

const meta = Reflect.getMetadata(AiTool.KEY, UpdateFilesTool) as AiToolMetadata;
const item = (id: number, currentName: string, displayName: string) => ({
   id,
   currentName,
   displayName,
});

describe('UpdateFilesTool', () => {
   let service: { updateMany: jest.Mock };
   let tool: UpdateFilesTool;

   beforeEach(() => {
      service = {
         updateMany: jest.fn().mockResolvedValue({
            updated: [
               { id: 1, originalName: 'a', displayName: 'b', language: null, altText: null },
            ],
            failed: [],
         }),
      };
      tool = new UpdateFilesTool(service as unknown as FileService);
   });

   it('needs files.update like PATCH /files/:id and always asks for approval', () => {
      expect(meta).toMatchObject({
         permission: { resource: PermissionResource.files, action: PermissionAction.update },
         behavior: 'mutating',
         needsApproval: true,
         audit: { action: 'file.updateMany' },
      });
   });

   it('passes the current names for the check and the publish permission of the caller', async () => {
      await tool.execute(adminContext(), { files: [item(1, 'screencapture-a.png', 'a.png')] });
      await tool.execute(contextWithGrants([]), { files: [item(1, 'x', 'y')] });

      expect(service.updateMany).toHaveBeenNthCalledWith(
         1,
         [
            {
               id: 1,
               expectedName: 'screencapture-a.png',
               displayName: 'a.png',
               language: undefined,
               altText: undefined,
            },
         ],
         true,
      );
      expect(service.updateMany.mock.calls[1][1]).toBe(false);
   });

   it('reports a batch that changed nothing as not applied, with a reason per file', async () => {
      service.updateMany.mockResolvedValue({
         updated: [],
         failed: [{ id: 2, reason: 'File not found' }],
      });

      expect(await tool.execute(adminContext(), { files: [item(2, 'a', 'b')] })).toEqual({
         applied: false,
         updatedCount: 0,
         updated: [],
         failed: [{ id: 2, reason: 'File not found' }],
      });
   });

   it('answers the updated files of an applied batch', async () => {
      expect(await tool.execute(adminContext(), { files: [item(1, 'a', 'b')] })).toEqual({
         applied: true,
         updatedCount: 1,
         updated: [{ id: 1, displayName: 'b', language: null, altText: null }],
         failed: [],
      });
   });

   it('sets the alt text of many images in one call', async () => {
      service.updateMany.mockResolvedValue({
         updated: [
            { id: 1, originalName: 'a', displayName: null, language: 'cs', altText: 'Logo' },
         ],
         failed: [],
      });

      const result = await tool.execute(adminContext(), {
         files: [{ id: 1, currentName: 'a', altText: 'Logo' }],
      });

      expect(service.updateMany.mock.calls[0][0]).toEqual([
         { id: 1, expectedName: 'a', displayName: undefined, language: undefined, altText: 'Logo' },
      ]);
      expect(result.updated).toEqual([
         { id: 1, displayName: null, language: 'cs', altText: 'Logo' },
      ]);
   });

   describe('input schema', () => {
      const parse = (input: unknown) => meta.inputSchema.safeParse(input).success;

      it('limits the alt text to 300 characters and accepts it as the only change', () => {
         const file = (altText: string) => ({ id: 1, currentName: 'a', altText });

         expect(parse({ files: [file('x'.repeat(300))] })).toBe(true);
         expect(parse({ files: [file('x'.repeat(301))] })).toBe(false);
      });

      it('takes up to the tool limit of files', () => {
         const files = (n: number) =>
            Array.from({ length: n }, (_, i) => item(i + 1, `a${i}`, `b${i}`));

         expect(parse({ files: files(TOOL_LIST_MAX_LIMIT) })).toBe(true);
         expect(parse({ files: files(TOOL_LIST_MAX_LIMIT + 1) })).toBe(false);
         expect(parse({ files: [] })).toBe(false);
      });

      it('rejects a duplicate id, an item without a change and an item without currentName', () => {
         expect(parse({ files: [item(1, 'a', 'b'), item(1, 'c', 'd')] })).toBe(false);
         expect(parse({ files: [{ id: 1, currentName: 'a' }] })).toBe(false);
         expect(parse({ files: [{ id: 1, displayName: 'b' }] })).toBe(false);
      });
   });
});
