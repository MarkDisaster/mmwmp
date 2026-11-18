import {
   adminContext,
   contextWithGrants,
   noPermissionContext,
} from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import type { AuditQueryService } from '@/audit/audit-query.service';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { ContentStatsService } from '../../content-stats.service';
import { GetContentStatsTool } from '../get-content-stats.tool';

const meta = Reflect.getMetadata(AiTool.KEY, GetContentStatsTool) as AiToolMetadata;

describe('GetContentStatsTool', () => {
   let stats: Record<'projects' | 'services' | 'tags' | 'users' | 'files', jest.Mock>;
   let auditQuery: { latest: jest.Mock };
   let tool: GetContentStatsTool;

   beforeEach(() => {
      stats = {
         projects: jest.fn().mockResolvedValue({ total: 3 }),
         services: jest.fn().mockResolvedValue({ total: 2 }),
         tags: jest.fn().mockResolvedValue({ total: 5 }),
         users: jest.fn().mockResolvedValue({ total: 4 }),
         files: jest.fn().mockResolvedValue({ total: 9, totalSizeBytes: 1000 }),
      };
      auditQuery = {
         latest: jest.fn().mockResolvedValue([
            {
               id: 7,
               createdAt: new Date('2026-01-01'),
               action: 'project.create',
               resourceType: 'project',
               resourceId: '1',
               actorType: 'user',
               user: { id: 2, firstName: 'Jana', lastName: 'Nová', email: 'j@x.cz' },
            },
         ]),
      };
      tool = new GetContentStatsTool(
         stats as unknown as ContentStatsService,
         auditQuery as unknown as AuditQueryService,
      );
   });

   it('is read-only with projects.read as the static grant', () => {
      expect(meta).toMatchObject({
         permission: { resource: PermissionResource.projects, action: PermissionAction.read },
         behavior: 'readonly',
      });
   });

   it('returns every part and the 10 latest changes without e-mail for an admin', async () => {
      const result = await tool.execute(adminContext(), {});

      expect(result).toMatchObject({
         projects: { total: 3 },
         services: { total: 2 },
         tags: { total: 5 },
         users: { total: 4 },
         files: { total: 9, totalSizeBytes: 1000 },
         omitted: [],
      });
      expect(auditQuery.latest).toHaveBeenCalledWith(10);
      expect(result.latestChanges).toEqual([
         {
            id: 7,
            createdAt: new Date('2026-01-01'),
            action: 'project.create',
            resourceType: 'project',
            resourceId: '1',
            actorType: 'user',
            actor: { id: 2, name: 'Jana Nová' },
         },
      ]);
   });

   it('omits the audit log without audit_logs.read and names it', async () => {
      const ctx = contextWithGrants([
         { resource: PermissionResource.projects, action: PermissionAction.read },
         { resource: PermissionResource.files, action: PermissionAction.read },
      ]);

      const result = await tool.execute(ctx, {});

      expect(result).not.toHaveProperty('latestChanges');
      expect(auditQuery.latest).not.toHaveBeenCalled();
      expect(result.omitted).toEqual([
         { part: 'services', missingPermission: 'services.read' },
         { part: 'tags', missingPermission: 'tags.read' },
         { part: 'users', missingPermission: 'users.read' },
         { part: 'latestChanges', missingPermission: 'audit_logs.read' },
      ]);
      expect(stats.users).not.toHaveBeenCalled();
   });

   it('reads only the requested parts', async () => {
      await tool.execute(adminContext(), { parts: ['tags'] });

      expect(stats.tags).toHaveBeenCalled();
      expect(stats.projects).not.toHaveBeenCalled();
      expect(auditQuery.latest).not.toHaveBeenCalled();
   });

   it('reads nothing for a caller without grants', async () => {
      const result = await tool.execute(noPermissionContext(), {});

      expect(result.omitted).toHaveLength(6);
      expect(stats.projects).not.toHaveBeenCalled();
   });
});
