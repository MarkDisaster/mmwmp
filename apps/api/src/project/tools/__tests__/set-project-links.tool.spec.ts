import { NotFoundException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool } from '@/ai/tools/ai-tool.decorator';

import type { ProjectService } from '../../project.service';
import { SetProjectLinksTool } from '../set-project-links.tool';

const ADMIN_ACTOR = { userId: 1, canPublish: true };

describe('SetProjectLinksTool', () => {
   let service: { assignLinks: jest.Mock };
   let toolInstance: SetProjectLinksTool;

   beforeEach(() => {
      service = { assignLinks: jest.fn() };
      toolInstance = new SetProjectLinksTool(service as unknown as ProjectService);
   });

   const run = (links: Array<{ label?: string | null; url: string }>) =>
      toolInstance.execute(adminContext(), { projectId: 4, links });

   it('is NOT destructive — links can be set again, so no approval tile', () => {
      expect(Reflect.getMetadata(AiTool.KEY, SetProjectLinksTool)).toMatchObject({
         behavior: 'mutating',
      });
   });

   it('delegates to ProjectService.assignLinks and returns the saved links', async () => {
      service.assignLinks.mockResolvedValue({
         id: 4,
         links: [
            { id: 9, projectId: 4, label: 'GitHub', url: 'https://github.com/a', sortOrder: 0 },
         ],
      });

      const result = await run([{ label: 'GitHub', url: 'https://github.com/a' }]);

      expect(service.assignLinks).toHaveBeenCalledWith(
         4,
         { links: [{ label: 'GitHub', url: 'https://github.com/a' }] },
         ADMIN_ACTOR,
      );
      expect(result).toEqual({
         projectId: 4,
         links: [{ label: 'GitHub', url: 'https://github.com/a' }],
      });
   });

   it('rewrites NotFoundException into a tool error', async () => {
      service.assignLinks.mockRejectedValue(new NotFoundException());

      await expect(run([])).rejects.toThrow(/Project with id 4 not found/);
   });

   describe('input schema', () => {
      const schema = Reflect.getMetadata(AiTool.KEY, SetProjectLinksTool).inputSchema;
      const parse = (url: string) => schema.safeParse({ projectId: 4, links: [{ url }] });

      it.each(['javascript:alert(1)', 'ftp://example.com', 'https://localhost', 'https://a.cz/ b'])(
         'should reject %s',
         (url) => {
            expect(parse(url).success).toBe(false);
         },
      );

      it('should accept the main link plus 10 more and reject a 12th link', () => {
         const links = (count: number) =>
            Array.from({ length: count }, (_, i) => ({ url: `https://example.com/${i}` }));

         expect(schema.safeParse({ projectId: 4, links: links(11) }).success).toBe(true);
         expect(schema.safeParse({ projectId: 4, links: links(12) }).success).toBe(false);
      });

      it('should trim a valid URL', () => {
         const result = parse('  https://example.com/repo  ');

         expect(result.success).toBe(true);
         expect(result.data.links[0].url).toBe('https://example.com/repo');
      });
   });
});
