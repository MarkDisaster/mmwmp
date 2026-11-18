import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { RevalidationService } from '../../revalidation.service';
import { RevalidateWebsiteTool } from '../revalidate-website.tool';

const meta = Reflect.getMetadata(AiTool.KEY, RevalidateWebsiteTool) as AiToolMetadata;

describe('RevalidateWebsiteTool', () => {
   let revalidation: { revalidateNow: jest.Mock };
   let tool: RevalidateWebsiteTool;

   beforeEach(() => {
      revalidation = {
         revalidateNow: jest.fn().mockResolvedValue([{ tag: 'projects', revalidated: true }]),
      };
      tool = new RevalidateWebsiteTool(revalidation as unknown as RevalidationService);
   });

   it('is mutating with projects.publish, an approval tile and an audit row', () => {
      expect(meta).toMatchObject({
         permission: { resource: PermissionResource.projects, action: PermissionAction.publish },
         behavior: 'mutating',
         needsApproval: true,
         audit: { action: 'website.revalidate', resourceType: 'website' },
      });
   });

   it('revalidates the given tags and reports success', async () => {
      const result = await tool.execute(adminContext(), { tags: ['projects'] });

      expect(revalidation.revalidateNow).toHaveBeenCalledWith(['projects']);
      expect(result).toEqual({
         allRevalidated: true,
         results: [{ tag: 'projects', revalidated: true }],
      });
   });

   it('fails (so the audit row is a failure) when no tag was refreshed, with the reasons', async () => {
      revalidation.revalidateNow.mockResolvedValue([
         { tag: 'projects', revalidated: false, reason: 'the web did not answer in time' },
         { tag: 'tags', revalidated: false, reason: 'the web answered 401' },
      ]);

      await expect(tool.execute(adminContext(), { tags: ['projects', 'tags'] })).rejects.toThrow(
         'The web was not refreshed: projects: the web did not answer in time; tags: the web answered 401',
      );
   });

   it('says which tag failed and why', async () => {
      revalidation.revalidateNow.mockResolvedValue([
         { tag: 'projects', revalidated: true },
         { tag: 'services', revalidated: false, reason: 'the web answered 401' },
      ]);

      const result = await tool.execute(adminContext(), { tags: ['projects', 'services'] });

      expect(result.allRevalidated).toBe(false);
      expect(result.results[1]).toEqual({
         tag: 'services',
         revalidated: false,
         reason: 'the web answered 401',
      });
   });

   it('accepts only the tags the web knows, once each', () => {
      expect(meta.inputSchema.safeParse({ tags: ['projects', 'contact'] }).success).toBe(true);
      expect(meta.inputSchema.safeParse({ tags: ['everything'] }).success).toBe(false);
      expect(meta.inputSchema.safeParse({ tags: ['tags', 'tags'] }).success).toBe(false);
      expect(meta.inputSchema.safeParse({ tags: [] }).success).toBe(false);
   });
});
