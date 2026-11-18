import { ConflictException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { FileService } from '../../file.service';
import { DeleteFilesTool } from '../delete-files.tool';
import { FindUnusedFilesTool } from '../find-unused-files.tool';

const meta = (Class: object) => Reflect.getMetadata(AiTool.KEY, Class) as AiToolMetadata;

describe('FindUnusedFilesTool', () => {
   it('is read-only with files.read and answers the totals of all unused files', async () => {
      const createdAt = new Date();
      const service = {
         findUnused: jest.fn().mockResolvedValue({
            totalCount: 40,
            totalSizeBytes: 5000,
            data: [
               {
                  id: 1,
                  originalName: 'a.png',
                  displayName: null,
                  mimeType: 'image/png',
                  size: 900,
                  createdAt,
               },
            ],
         }),
      };
      const tool = new FindUnusedFilesTool(service as unknown as FileService);

      const result = await tool.execute(adminContext(), { limit: TOOL_LIST_MAX_LIMIT + 50 });

      expect(meta(FindUnusedFilesTool)).toMatchObject({
         permission: { resource: PermissionResource.files, action: PermissionAction.read },
         behavior: 'readonly',
      });
      expect(service.findUnused).toHaveBeenCalledWith(0, TOOL_LIST_MAX_LIMIT);
      expect(result).toEqual({
         total: 40,
         totalSizeBytes: 5000,
         items: [{ id: 1, name: 'a.png', mimeType: 'image/png', sizeBytes: 900, createdAt }],
      });
   });
});

describe('DeleteFilesTool', () => {
   let service: { trash: jest.Mock; findSummaries: jest.Mock };
   let tool: DeleteFilesTool;

   beforeEach(() => {
      service = {
         trash: jest.fn().mockResolvedValue(undefined),
         findSummaries: jest.fn().mockResolvedValue(
            new Map([
               [1, { name: 'a', size: 100 }],
               [2, { name: 'b', size: 50 }],
               [3, { name: 'c', size: 10 }],
            ]),
         ),
      };
      tool = new DeleteFilesTool(service as unknown as FileService);
   });

   it('is destructive and needs files.delete (approval tile)', () => {
      expect(meta(DeleteFilesTool)).toMatchObject({
         permission: { resource: PermissionResource.files, action: PermissionAction.delete },
         behavior: 'destructive',
      });
   });

   it('deletes the files, sums the freed size and lists a refused file in failed', async () => {
      service.trash.mockImplementation((id: number) =>
         id === 2
            ? Promise.reject(new ConflictException('File is still used as project media'))
            : Promise.resolve(),
      );

      const result = await tool.execute(adminContext(), {
         files: [
            { id: 1, name: 'a', sizeBytes: 100 },
            { id: 2, name: 'b', sizeBytes: 50 },
            { id: 3, name: 'c', sizeBytes: 10 },
         ],
      });

      expect(result).toMatchObject({
         deletedCount: 2,
         freedBytes: 110,
         failed: [{ id: 2, name: 'b', reason: 'File is still used as project media' }],
      });
   });

   it('deletes nothing when a name or size differs from the database', async () => {
      const result = await tool.execute(adminContext(), {
         files: [
            { id: 1, name: 'a', sizeBytes: 100 },
            { id: 2, name: 'b', sizeBytes: 9999 },
            { id: 4, name: 'ghost', sizeBytes: 1 },
         ],
      });

      expect(service.trash).not.toHaveBeenCalled();
      expect(result).toMatchObject({ applied: false, deletedCount: 0, deleted: [] });
      expect(result.failed.map(({ id }) => id)).toEqual([2, 4]);
   });

   it('reports an unexpected error as a failure and keeps the files already deleted', async () => {
      service.trash.mockImplementation((id: number) =>
         id === 2 ? Promise.reject(new Error('storage down')) : Promise.resolve(),
      );

      const result = await tool.execute(adminContext(), {
         files: [
            { id: 1, name: 'a', sizeBytes: 100 },
            { id: 2, name: 'b', sizeBytes: 50 },
            { id: 3, name: 'c', sizeBytes: 10 },
         ],
      });

      expect(result).toMatchObject({
         applied: false,
         deletedCount: 2,
         freedBytes: 110,
         failed: [{ id: 2, reason: 'Unexpected error' }],
      });
      expect(meta(DeleteFilesTool).audit?.resourceIdFrom?.({}, result)).toBe('1,3');
   });

   it('caps the batch at the tool limit', () => {
      const files = (n: number) =>
         Array.from({ length: n }, (_, i) => ({ id: i + 1, name: 'x', sizeBytes: 1 }));

      expect(meta(DeleteFilesTool).inputSchema.safeParse({ files: files(100) }).success).toBe(true);
      expect(meta(DeleteFilesTool).inputSchema.safeParse({ files: files(101) }).success).toBe(
         false,
      );
   });
});
