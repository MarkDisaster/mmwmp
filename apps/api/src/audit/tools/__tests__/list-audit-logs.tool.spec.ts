import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { AuditQueryService } from '../../audit-query.service';
import { ListAuditLogsTool } from '../list-audit-logs.tool';

const meta = Reflect.getMetadata(AiTool.KEY, ListAuditLogsTool) as AiToolMetadata;

describe('ListAuditLogsTool', () => {
   let query: { list: jest.Mock };
   let tool: ListAuditLogsTool;
   const createdAt = new Date('2026-03-04T05:06:07Z');

   beforeEach(() => {
      query = {
         list: jest.fn().mockResolvedValue({
            totalCount: 1,
            data: [
               {
                  id: 5,
                  userId: 2,
                  actorType: 'ai',
                  action: 'project.update',
                  resourceType: 'project',
                  resourceId: '12',
                  metadata: { secret: 'x' },
                  ipAddress: '1.2.3.4',
                  createdAt,
                  user: { id: 2, firstName: 'Jana', lastName: 'Nová', email: 'j@x.cz' },
               },
            ],
         }),
      };
      tool = new ListAuditLogsTool(query as unknown as AuditQueryService);
   });

   it('needs audit_logs.read and is read-only, as GET /audit/logs is', () => {
      expect(meta.permission).toEqual({
         resource: PermissionResource.audit_logs,
         action: PermissionAction.read,
      });
      expect(meta.behavior).toBe('readonly');
   });

   it('returns entries without e-mail, metadata or IP address', async () => {
      const result = await tool.execute(adminContext(), {});

      expect(result).toEqual({
         total: 1,
         items: [
            {
               id: 5,
               createdAt,
               action: 'project.update',
               resourceType: 'project',
               resourceId: '12',
               actorType: 'ai',
               actor: { id: 2, name: 'Jana Nová' },
            },
         ],
      });
   });

   it('forwards the filters and starts at page 0 with the default limit', async () => {
      await tool.execute(adminContext(), {
         action: 'project.update',
         resourceType: 'project',
         actorType: 'ai',
         userId: 2,
         from: '2026-03-01',
         to: '2026-03-04',
      });

      expect(query.list).toHaveBeenCalledWith({
         action: 'project.update',
         resourceType: 'project',
         actorType: 'ai',
         userId: 2,
         from: '2026-03-01',
         to: '2026-03-04',
         page: 0,
         limit: TOOL_LIST_DEFAULT_LIMIT,
      });
   });

   it('caps the limit in the schema and in execute', async () => {
      expect(meta.inputSchema.safeParse({ limit: TOOL_LIST_MAX_LIMIT + 1 }).success).toBe(false);
      expect(meta.inputSchema.safeParse({ from: 'yesterday' }).success).toBe(false);

      await tool.execute(adminContext(), { limit: TOOL_LIST_MAX_LIMIT + 50 });

      expect(query.list).toHaveBeenCalledWith(
         expect.objectContaining({ limit: TOOL_LIST_MAX_LIMIT }),
      );
   });
});
