import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';

import type { TagService } from '../../tag.service';
import { ListTagsTool } from '../list-tags.tool';

describe('ListTagsTool', () => {
   let service: { findAll: jest.Mock };
   let toolInstance: ListTagsTool;

   beforeEach(() => {
      service = {
         findAll: jest.fn().mockResolvedValue({
            totalCount: 1,
            data: [
               {
                  id: 1,
                  translations: [{ language: 'cs', name: 'React' }],
                  slug: 'react',
                  color: '#06f',
                  status: 'published',
                  sortOrder: 0,
                  createdAt: new Date('2026-01-01'),
                  updatedAt: new Date('2026-01-02'),
               },
            ],
         }),
      };
      toolInstance = new ListTagsTool(service as unknown as TagService);
   });

   const run = (input: Record<string, unknown>) => toolInstance.execute(adminContext(), input);

   it('calls TagService.findAll with default page/limit, last changed first', async () => {
      await run({});

      expect(service.findAll).toHaveBeenCalledWith({
         page: 0,
         limit: TOOL_LIST_DEFAULT_LIMIT,
         search: undefined,
         sortOrder: 'desc',
         sortBy: 'updatedAt',
      });
   });

   it('lists in the display order when asked for `sortOrder`', async () => {
      await run({ sortBy: 'sortOrder', limit: 100 });

      expect(service.findAll).toHaveBeenCalledWith(
         expect.objectContaining({ sortBy: 'sortOrder', sortOrder: 'asc', limit: 100 }),
      );
   });

   it('clamps oversized `limit` to the max', async () => {
      await run({ limit: TOOL_LIST_MAX_LIMIT + 50 });

      expect(service.findAll).toHaveBeenCalledWith(
         expect.objectContaining({ limit: TOOL_LIST_MAX_LIMIT }),
      );
   });
});
