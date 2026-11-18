import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool } from '@/ai/tools/ai-tool.decorator';
import { LOOKUP_CANDIDATE_LIMIT } from '@/ai/tools/lookup';

import type { ProjectService } from '../../project.service';
import { FindProjectsTool } from '../find-projects.tool';

const CANDIDATES = [
   {
      id: 12,
      title: 'Selltoro',
      slug: 'selltoro',
      status: 'published',
      company: 'Selltoro s.r.o.',
      translations: [
         { language: 'cs', title: 'Selltoro' },
         { language: 'en', title: 'Selltoro marketplace' },
      ],
   },
   {
      id: 7,
      title: 'Nemocnice Jindřichův Hradec',
      slug: 'nemocnice-jh',
      status: 'draft',
      company: null,
      translations: [{ language: 'en', title: 'Hospital Jindrichuv Hradec' }],
   },
];

describe('FindProjectsTool', () => {
   let service: { findLookupCandidates: jest.Mock };
   let tool: FindProjectsTool;

   beforeEach(() => {
      service = { findLookupCandidates: jest.fn().mockResolvedValue(CANDIDATES) };
      tool = new FindProjectsTool(service as unknown as ProjectService);
   });

   it('is a read-only tool behind projects.read', () => {
      expect(Reflect.getMetadata(AiTool.KEY, FindProjectsTool)).toMatchObject({
         behavior: 'readonly',
         permission: { resource: 'projects', action: 'read' },
      });
   });

   it('loads one candidate more than it scores, to tell a full table from a capped one', async () => {
      await tool.execute(adminContext(), { query: 'selltoro' });
      expect(service.findLookupCandidates).toHaveBeenCalledWith(LOOKUP_CANDIDATE_LIMIT + 1);
   });

   it('finds a project by a misspelled name and links its admin detail', async () => {
      const result = await tool.execute(adminContext(), { query: 'seltoro' });

      expect(result.items).toEqual([
         {
            id: 12,
            title: 'Selltoro',
            slug: 'selltoro',
            status: 'published',
            company: 'Selltoro s.r.o.',
            adminUrl: '/projects/12',
            match: 'fuzzy',
            matchedOn: 'title',
         },
      ]);
   });

   it('matches a translated title without diacritics', async () => {
      const result = await tool.execute(adminContext(), { query: 'hospital' });

      expect(result.items).toMatchObject([{ id: 7, matchedOn: 'title (en)', match: 'partial' }]);
   });
});
