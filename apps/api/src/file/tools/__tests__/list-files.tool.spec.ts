import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT } from '@/ai/tools/limits';

import type { FileService } from '../../file.service';
import { ListFilesTool } from '../list-files.tool';

describe('ListFilesTool', () => {
   let service: { findAll: jest.Mock };
   let toolInstance: ListFilesTool;

   beforeEach(() => {
      service = {
         findAll: jest.fn().mockResolvedValue({
            totalCount: 0,
            data: [],
         }),
      };
      toolInstance = new ListFilesTool(service as unknown as FileService);
   });

   const run = (input: Record<string, unknown>) => toolInstance.execute(adminContext(), input);

   it('defaults to createdAt DESC when no sort is given', async () => {
      await run({});

      expect(service.findAll).toHaveBeenCalledWith(
         expect.objectContaining({
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: TOOL_LIST_DEFAULT_LIMIT,
         }),
      );
   });

   it('uses ASC by default for originalName sort (A → Z)', async () => {
      await run({ sortBy: 'originalName' });

      expect(service.findAll).toHaveBeenCalledWith(
         expect.objectContaining({ sortBy: 'originalName', sortOrder: 'asc' }),
      );
   });

   it('forwards `mimeTypePrefix` filter', async () => {
      await run({ mimeTypePrefix: 'image/' });

      expect(service.findAll).toHaveBeenCalledWith(
         expect.objectContaining({ mimeTypePrefix: 'image/' }),
      );
   });

   describe('input schema', () => {
      const schema = Reflect.getMetadata(AiTool.KEY, ListFilesTool).inputSchema;

      it.each(['image/', 'image/png', 'application/pdf'])('accepts the prefix %s', (prefix) => {
         expect(schema.safeParse({ mimeTypePrefix: prefix }).success).toBe(true);
      });

      it.each(['image', '%', 'image/%', 'image/_', '*/*'])('rejects the prefix %p', (prefix) => {
         expect(schema.safeParse({ mimeTypePrefix: prefix }).success).toBe(false);
      });
   });
});
