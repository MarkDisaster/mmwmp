import {
   adminContext,
   contextWithGrants,
   noPermissionContext,
} from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { ContentAuditService } from '../../content-audit.service';
import { AuditContentTool } from '../audit-content.tool';

const meta = Reflect.getMetadata(AiTool.KEY, AuditContentTool) as AiToolMetadata;

const category = { total: 1, items: [{ id: 1, name: 'A', adminUrl: '/projects/1' }] };

describe('AuditContentTool', () => {
   let audit: { auditProjects: jest.Mock; auditServices: jest.Mock; auditFiles: jest.Mock };
   let tool: AuditContentTool;

   beforeEach(() => {
      audit = {
         auditProjects: jest.fn().mockResolvedValue({ withoutThumbnail: category }),
         auditServices: jest.fn().mockResolvedValue({ oldDrafts: category }),
         auditFiles: jest.fn().mockResolvedValue({ unused: category }),
      };
      tool = new AuditContentTool(audit as unknown as ContentAuditService);
   });

   it('is read-only with projects.read as the static grant', () => {
      expect(meta).toMatchObject({
         permission: { resource: PermissionResource.projects, action: PermissionAction.read },
         behavior: 'readonly',
      });
      expect(meta.audit).toBeUndefined();
   });

   it('audits all three parts for an admin, with 30 days as the default draft age', async () => {
      const before = Date.now();
      const result = await tool.execute(adminContext(), {});
      const after = Date.now();

      expect(result).toMatchObject({
         draftOlderThanDays: 30,
         sampleSize: 20,
         projects: { withoutThumbnail: category },
         services: { oldDrafts: category },
         files: { unused: category },
         omitted: [],
      });
      const cutoff = (audit.auditProjects.mock.calls[0][0] as Date).getTime();
      const thirtyDays = 30 * 24 * 3600 * 1000;
      expect(cutoff).toBeGreaterThanOrEqual(before - thirtyDays);
      expect(cutoff).toBeLessThanOrEqual(after - thirtyDays);
   });

   it('passes the draft age of the input', async () => {
      const result = await tool.execute(adminContext(), { draftOlderThanDays: 7 });

      expect(result.draftOlderThanDays).toBe(7);
      const cutoff = audit.auditServices.mock.calls[0][0] as Date;
      expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(7 * 24 * 3600 * 1000);
   });

   it('leaves out a part the caller may not read and names it', async () => {
      const ctx = contextWithGrants([
         { resource: PermissionResource.projects, action: PermissionAction.read },
      ]);

      const result = await tool.execute(ctx, {});

      expect(result.projects).toBeDefined();
      expect(result).not.toHaveProperty('services');
      expect(result).not.toHaveProperty('files');
      expect(result.omitted).toEqual([
         { part: 'services', missingPermission: 'services.read' },
         { part: 'files', missingPermission: 'files.read' },
      ]);
      expect(audit.auditServices).not.toHaveBeenCalled();
      expect(audit.auditFiles).not.toHaveBeenCalled();
   });

   it('reads nothing for a caller with no read grant', async () => {
      const result = await tool.execute(noPermissionContext(), { parts: ['files'] });

      expect(result).not.toHaveProperty('files');
      expect(result.omitted).toEqual([{ part: 'files', missingPermission: 'files.read' }]);
      expect(audit.auditProjects).not.toHaveBeenCalled();
   });

   it('rejects a draft age outside 1..3650 days', () => {
      expect(meta.inputSchema.safeParse({ draftOlderThanDays: 0 }).success).toBe(false);
      expect(meta.inputSchema.safeParse({ draftOlderThanDays: 4000 }).success).toBe(false);
      expect(meta.inputSchema.safeParse({ parts: [] }).success).toBe(false);
   });
});
