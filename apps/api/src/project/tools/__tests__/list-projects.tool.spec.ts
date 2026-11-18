import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';

import type { ProjectService } from '../../project.service';
import { ListProjectsTool } from '../list-projects.tool';

describe('ListProjectsTool', () => {
   let service: { findAll: jest.Mock };
   let toolInstance: ListProjectsTool;

   beforeEach(() => {
      service = {
         findAll: jest.fn().mockResolvedValue({
            totalCount: 2,
            data: [
               {
                  id: 1,
                  title: 'A',
                  slug: 'a',
                  status: 'published',
                  sortOrder: 0,
                  company: 'ACME',
                  startYear: 2024,
                  endYear: null,
                  ongoing: true,
                  links: [
                     {
                        id: 1,
                        projectId: 1,
                        label: 'GitHub',
                        url: 'https://github.com/a',
                        sortOrder: 0,
                     },
                  ],
                  tags: [
                     {
                        projectId: 1,
                        tagId: 5,
                        sortOrder: 0,
                        tag: { id: 5, translations: [{ language: 'cs', name: 'React' }] },
                     },
                     {
                        projectId: 1,
                        tagId: 3,
                        sortOrder: 1,
                        tag: { id: 3, translations: [{ language: 'cs', name: 'NestJS' }] },
                     },
                  ],
                  translations: [{ language: 'en' }, { language: 'cs' }],
                  publishedAt: new Date('2026-01-01'),
                  updatedAt: new Date('2026-02-01'),
                  createdAt: new Date('2026-01-01'),
               },
               {
                  id: 2,
                  title: 'B',
                  slug: 'b',
                  status: 'draft',
                  sortOrder: 1,
                  company: null,
                  startYear: null,
                  endYear: null,
                  ongoing: false,
                  links: [],
                  tags: [],
                  translations: [{ language: 'cs' }],
                  publishedAt: null,
                  updatedAt: new Date('2026-02-02'),
                  createdAt: new Date('2026-01-02'),
               },
            ],
         }),
      };
      toolInstance = new ListProjectsTool(service as unknown as ProjectService);
   });

   const run = (input: Record<string, unknown>) => toolInstance.execute(adminContext(), input);

   it('passes default page/limit/sort to ProjectService.findAll', async () => {
      await run({});

      expect(service.findAll).toHaveBeenCalledWith({
         page: 0,
         limit: TOOL_LIST_DEFAULT_LIMIT,
         search: undefined,
         sortOrder: 'desc',
         sortBy: 'updatedAt',
      });
   });

   it('forwards `search` and clamps `limit` to the maximum', async () => {
      await run({ search: 'foo', limit: TOOL_LIST_MAX_LIMIT + 999 });

      expect(service.findAll).toHaveBeenCalledWith(
         expect.objectContaining({
            search: 'foo',
            limit: TOOL_LIST_MAX_LIMIT,
         }),
      );
   });

   it('returns a compact shape: total + items projected to the agent fields', async () => {
      const result = (await run({})) as {
         total: number;
         items: Array<{ id: number; title: string }>;
      };

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual(
         expect.objectContaining({
            id: 1,
            title: 'A',
            slug: 'a',
            status: 'published',
            sortOrder: 0,
         }),
      );
   });

   it('lists the projects in their display order on request', async () => {
      await toolInstance.execute(adminContext(), { sortBy: 'sortOrder', limit: 100 });

      expect(service.findAll).toHaveBeenCalledWith(
         expect.objectContaining({ sortBy: 'sortOrder', sortOrder: 'asc', limit: 100 }),
      );
   });

   it('includes company, the years and the links without their internal ids', async () => {
      const result = (await run({})) as { items: Array<Record<string, unknown>> };

      expect(result.items[0]).toEqual(
         expect.objectContaining({
            company: 'ACME',
            startYear: 2024,
            endYear: null,
            ongoing: true,
            links: [{ label: 'GitHub', url: 'https://github.com/a' }],
         }),
      );
      expect(result.items[1]).toEqual(expect.objectContaining({ company: null, links: [] }));
      expect(result.items[0]).not.toHaveProperty('url');
   });

   it('returns the current tags in display order, so a full replace can keep them', async () => {
      const result = (await run({})) as { items: Array<Record<string, unknown>> };

      expect(result.items[0]).toEqual(
         expect.objectContaining({
            tags: [
               { id: 5, name: 'React' },
               { id: 3, name: 'NestJS' },
            ],
            languages: ['cs', 'en'],
         }),
      );
      expect(result.items[1]).toEqual(expect.objectContaining({ tags: [], languages: ['cs'] }));
   });
});
