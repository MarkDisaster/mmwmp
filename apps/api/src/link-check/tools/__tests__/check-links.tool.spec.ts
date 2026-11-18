import {
   adminContext,
   contextWithGrants,
   noPermissionContext,
} from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { LinkCheckService, LinkUsage } from '../../link-check.service';
import { CheckLinksTool } from '../check-links.tool';

const meta = Reflect.getMetadata(AiTool.KEY, CheckLinksTool) as AiToolMetadata;

const usage: LinkUsage = { kind: 'projectLink', id: 1, name: 'P', adminUrl: '/projects/1' };

describe('CheckLinksTool', () => {
   let linkCheck: { collect: jest.Mock; check: jest.Mock };
   let tool: CheckLinksTool;

   beforeEach(() => {
      linkCheck = {
         collect: jest.fn().mockResolvedValue({
            links: new Map([
               ['https://b.example.com/', [usage]],
               ['https://a.example.com/', [usage]],
            ]),
            truncated: [],
         }),
         check: jest.fn((urls: { url: string }[]) =>
            Promise.resolve(
               urls.map(({ url }) => ({ url, usedIn: [usage], status: 'ok', redirects: 0 })),
            ),
         ),
      };
      tool = new CheckLinksTool(linkCheck as unknown as LinkCheckService);
   });

   it('is read-only with projects.read, no approval and no audit row', () => {
      expect(meta).toMatchObject({
         permission: { resource: PermissionResource.projects, action: PermissionAction.read },
         behavior: 'readonly',
      });
      expect(meta.needsApproval).toBeUndefined();
      expect(meta.audit).toBeUndefined();
   });

   it('checks the sorted URLs and summarises the statuses', async () => {
      linkCheck.check.mockResolvedValue([
         { url: 'https://a.example.com/', usedIn: [usage], status: 'broken', redirects: 0 },
         { url: 'https://b.example.com/', usedIn: [usage], status: 'ok', redirects: 0 },
      ]);

      const result = await tool.execute(adminContext(), {});

      expect(linkCheck.collect).toHaveBeenCalledWith({ projects: true, services: true });
      expect(linkCheck.check.mock.calls[0][0].map((u: { url: string }) => u.url)).toEqual([
         'https://a.example.com/',
         'https://b.example.com/',
      ]);
      expect(result).toMatchObject({
         totalUrls: 2,
         page: 0,
         limit: 20,
         summary: { ok: 1, broken: 1, redirect: 0, blocked: 0, error: 0, skipped: 0 },
         omitted: [],
      });
   });

   it('pages through the URL list and caps a page at 40', async () => {
      const many = new Map(
         Array.from({ length: 100 }, (_, i) => [
            `https://h${String(i).padStart(3, '0')}.example.com/`,
            [usage],
         ]),
      );
      linkCheck.collect.mockResolvedValue({ links: many, truncated: [] });

      await tool.execute(adminContext(), { page: 1, limit: 40 });

      const urls = linkCheck.check.mock.calls[0][0] as { url: string }[];
      expect(urls).toHaveLength(40);
      expect(urls[0].url).toBe('https://h040.example.com/');
      expect(meta.inputSchema.safeParse({ limit: 41 }).success).toBe(false);
      expect(meta.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
   });

   it('reads only the parts the caller may read and names the others', async () => {
      const projectsOnly = contextWithGrants([
         { resource: PermissionResource.projects, action: PermissionAction.read },
      ]);

      const result = await tool.execute(projectsOnly, {});

      expect(linkCheck.collect).toHaveBeenCalledWith({ projects: true, services: false });
      expect(result.omitted).toEqual([{ part: 'services', missingPermission: 'services.read' }]);
   });

   it('reports a truncated source and counts the temporary redirects in the summary', async () => {
      linkCheck.collect.mockResolvedValue({
         links: new Map([['https://a.example.com/', [usage]]]),
         truncated: [{ source: 'projectTexts', limit: 2000 }],
      });
      linkCheck.check.mockResolvedValue([
         { url: 'https://a.example.com/', usedIn: [usage], status: 'temporary', redirects: 1 },
      ]);

      const result = await tool.execute(adminContext(), {});

      expect(result.truncated).toEqual([{ source: 'projectTexts', limit: 2000 }]);
      expect(result.summary.temporary).toBe(1);
   });

   it('requests nothing for a caller without a read grant', async () => {
      const result = await tool.execute(noPermissionContext(), {});

      expect(linkCheck.collect).toHaveBeenCalledWith({ projects: false, services: false });
      expect(result.omitted).toHaveLength(2);
   });
});
