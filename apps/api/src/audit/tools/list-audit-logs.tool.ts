import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { AuditActorType, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { AuditQueryService } from '../audit-query.service';

const inputSchema = z.object({
   action: z
      .string()
      .min(1)
      .optional()
      .describe(
         'Exact action, e.g. `project.create`, `project.updateStatus`, `runnerScore.delete`.',
      ),
   resourceType: z
      .string()
      .min(1)
      .optional()
      .describe('Exact resource type, e.g. `project`, `service`, `tag`, `user`, `role`, `file`.'),
   actorType: z
      .enum([AuditActorType.user, AuditActorType.ai, AuditActorType.system])
      .optional()
      .describe('Who acted: `user` (admin UI), `ai` (AURORA) or `system`.'),
   userId: z.number().int().positive().optional().describe('Only entries of this user id.'),
   from: z
      .string()
      .date()
      .optional()
      .describe('First day to include, `YYYY-MM-DD` (UTC, from 00:00).'),
   to: z.string().date().optional().describe('Last day to include, `YYYY-MM-DD` (UTC, whole day).'),
   page: z.number().int().min(0).optional().describe('Page number, 0-indexed. Defaults to 0.'),
   limit: z.number().int().min(1).max(TOOL_LIST_MAX_LIMIT).optional(),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'listAuditLogs',
   description:
      'List audit log entries, newest first: who changed what and when ("kdo změnil projekt X", ' +
      '"co dělala AURORA včera"). Filters are exact matches on `action` and `resourceType` ' +
      '(`project.updateStatus` / `project`), `actorType`, `userId` and a day range `from` / `to`. ' +
      '`resourceId` is the id of the record the entry is about. `total` is the number of entries ' +
      'matching the filters. To open the audit page in the admin use `navigateTo`.',
   inputSchema,
   permission: { resource: PermissionResource.audit_logs, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class ListAuditLogsTool extends AiToolHandler<Input> {
   constructor(private readonly auditQuery: AuditQueryService) {
      super();
   }

   async execute(_ctx: ToolContext, { page, limit, ...filters }: Input) {
      const result = await this.auditQuery.list({
         ...filters,
         page: page ?? 0,
         limit: Math.min(limit ?? TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT),
      });
      return {
         total: result.totalCount,
         items: result.data.map((entry) => ({
            id: entry.id,
            createdAt: entry.createdAt,
            action: entry.action,
            resourceType: entry.resourceType,
            resourceId: entry.resourceId,
            actorType: entry.actorType,
            actor: entry.user
               ? { id: entry.user.id, name: `${entry.user.firstName} ${entry.user.lastName}` }
               : null,
         })),
      };
   }
}
