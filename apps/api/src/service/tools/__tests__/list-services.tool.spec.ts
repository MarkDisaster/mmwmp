import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';

import type { ServiceService } from '../../service.service';
import { ListServicesTool } from '../list-services.tool';

describe('ListServicesTool', () => {
   let findAll: jest.Mock;
   let toolInstance: ListServicesTool;

   beforeEach(() => {
      findAll = jest.fn().mockResolvedValue({ data: [], totalCount: 0 });
      toolInstance = new ListServicesTool({ findAll } as unknown as ServiceService);
   });

   it('lists the last changed services first by default', async () => {
      await toolInstance.execute(adminContext(), {});

      expect(findAll).toHaveBeenCalledWith(
         expect.objectContaining({ sortBy: 'updatedAt', sortOrder: 'desc' }),
      );
   });

   it('returns the linked projects in display order, so a full replace can keep them', async () => {
      findAll.mockResolvedValue({
         totalCount: 1,
         data: [
            {
               id: 2,
               title: 'Web',
               slug: 'web',
               status: 'published',
               sortOrder: 0,
               projects: [
                  { project: { id: 7, slug: 'shop', translations: [{ title: 'E-shop' }] } },
                  { project: { id: 4, slug: 'no-translation', translations: [] } },
               ],
               translations: [{ language: 'cs' }],
               publishedAt: null,
               updatedAt: new Date(0),
               createdAt: new Date(0),
            },
         ],
      });

      const result = await toolInstance.execute(adminContext(), {});

      expect(result.items[0]).toEqual(
         expect.objectContaining({
            projects: [
               { id: 7, slug: 'shop', title: 'E-shop' },
               { id: 4, slug: 'no-translation', title: 'no-translation' },
            ],
            languages: ['cs'],
         }),
      );
   });

   it('lists the services in their display order on request', async () => {
      await toolInstance.execute(adminContext(), { sortBy: 'sortOrder', limit: 100 });

      expect(findAll).toHaveBeenCalledWith(
         expect.objectContaining({ sortBy: 'sortOrder', sortOrder: 'asc', limit: 100 }),
      );
   });
});
