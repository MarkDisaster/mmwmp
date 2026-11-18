import { NotFoundException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';

import type { ProjectService } from '../../project.service';
import { GetProjectTool } from '../get-project.tool';

const PROJECT = {
   id: 12,
   title: 'Selltoro',
   slug: 'selltoro',
   status: 'published',
   company: 'Selltoro s.r.o.',
   startYear: 2023,
   endYear: null,
   ongoing: true,
   showOnHomepage: true,
   sortOrder: 2,
   publishedAt: new Date('2026-03-28T10:00:00Z'),
   updatedAt: new Date('2026-04-01T10:00:00Z'),
   createdAt: new Date('2026-03-01T10:00:00Z'),
   translations: [
      {
         language: 'cs',
         title: 'Selltoro',
         role: 'Frontend',
         description: 'Popis',
         content: '<p>Obsah</p>',
         metaTitle: null,
         metaDescription: null,
      },
   ],
   tags: [{ tag: { id: 3, translations: [{ language: 'cs', name: 'React' }], slug: 'react' } }],
   links: [{ label: 'Web', url: 'https://selltoro.cz' }],
   thumbnail: { id: 40, displayName: null, originalName: 'cover.png' },
   media: [
      {
         id: 91,
         fileId: 41,
         language: 'cs',
         file: { displayName: 'Galerie 1', originalName: 'g1.png', mimeType: 'image/png' },
      },
   ],
   createdBy: { id: 5, firstName: 'Marek', lastName: 'Marek', email: 'm@example.com' },
};

describe('GetProjectTool', () => {
   let service: { findOne: jest.Mock };
   let tool: GetProjectTool;

   beforeEach(() => {
      service = { findOne: jest.fn().mockResolvedValue(PROJECT) };
      tool = new GetProjectTool(service as unknown as ProjectService);
   });

   it('returns tags, media with their mediaId and the admin link, without the long content', async () => {
      const result = await tool.execute(adminContext(), { id: 12 });

      expect(service.findOne).toHaveBeenCalledWith(12);
      expect(result).toMatchObject({
         id: 12,
         adminUrl: '/projects/12',
         tags: [{ id: 3, name: 'React', slug: 'react' }],
         thumbnail: { fileId: 40, name: 'cover.png' },
         media: [
            { mediaId: 91, fileId: 41, name: 'Galerie 1', mimeType: 'image/png', language: 'cs' },
         ],
         translations: [{ language: 'cs', title: 'Selltoro', contentLength: 12 }],
      });
      expect(result.translations[0]).not.toHaveProperty('content');
   });

   it("returns the author's id and name, never the e-mail (users.read is not projects.read)", async () => {
      const result = await tool.execute(adminContext(), { id: 12 });

      expect(result.createdBy).toEqual({ id: 5, name: 'Marek Marek' });
   });

   it('returns the content when asked for it', async () => {
      const result = await tool.execute(adminContext(), { id: 12, includeContent: true });

      expect(result.translations[0]).toMatchObject({ content: '<p>Obsah</p>' });
   });

   it('tells the model how to find the id when the project does not exist', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(tool.execute(adminContext(), { id: 99 })).rejects.toThrow(
         'Project with id 99 not found. Find the id with findProjects.',
      );
   });
});
