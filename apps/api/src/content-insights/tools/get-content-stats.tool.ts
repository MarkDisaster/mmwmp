import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { hasToolPermission, type ToolContext } from '@/ai/tools/tool-auth';
import { AuditQueryService } from '@/audit/audit-query.service';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ContentStatsService } from '../content-stats.service';

const LATEST_CHANGES = 10;

const PARTS = ['projects', 'services', 'tags', 'users', 'files', 'latestChanges'] as const;
type Part = (typeof PARTS)[number];

const PART_RESOURCE: Record<Part, PermissionResource> = {
   projects: PermissionResource.projects,
   services: PermissionResource.services,
   tags: PermissionResource.tags,
   users: PermissionResource.users,
   files: PermissionResource.files,
   latestChanges: PermissionResource.audit_logs,
};

const inputSchema = z.object({
   parts: z
      .array(z.enum(PARTS))
      .min(1)
      .optional()
      .describe(`Which parts to return. Omit for all of them: ${PARTS.join(', ')}.`),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'getContentStats',
   description:
      'Overview numbers of the admin ("kolik máme projektů", "stav obsahu", "kolik místa ' +
      'zabírají soubory"): `projects` and `services` (total, `byStatus` draft/published, ' +
      '`byLanguage` cs/en = how many have that translation), `tags` (total), `users` ' +
      '(total, active, deactivated, pendingInvitation), `files` (total, `totalSizeBytes`, ' +
      'byProcessingStatus, byLanguage with `none`) and `latestChanges` (the 10 newest audit log ' +
      'entries, only for a caller who may read the audit log). Only live rows are counted, the ' +
      'trash is excluded. A part the caller may not read is left out and named in `omitted`: ' +
      'tell the user. For a quality check of the content use `auditContent`.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class GetContentStatsTool extends AiToolHandler<Input> {
   constructor(
      private readonly stats: ContentStatsService,
      private readonly auditQuery: AuditQueryService,
   ) {
      super();
   }

   async execute(ctx: ToolContext, { parts }: Input) {
      const requested = parts ?? PARTS;
      const allowed = new Set(
         requested.filter((part) =>
            hasToolPermission(ctx, PART_RESOURCE[part], PermissionAction.read),
         ),
      );
      const omitted = requested
         .filter((part) => !allowed.has(part))
         .map((part) => ({ part, missingPermission: `${PART_RESOURCE[part]}.read` }));

      const [projects, services, tags, users, files, latest] = await Promise.all([
         allowed.has('projects') ? this.stats.projects() : undefined,
         allowed.has('services') ? this.stats.services() : undefined,
         allowed.has('tags') ? this.stats.tags() : undefined,
         allowed.has('users') ? this.stats.users() : undefined,
         allowed.has('files') ? this.stats.files() : undefined,
         allowed.has('latestChanges') ? this.auditQuery.latest(LATEST_CHANGES) : undefined,
      ]);

      return {
         ...(projects ? { projects } : {}),
         ...(services ? { services } : {}),
         ...(tags ? { tags } : {}),
         ...(users ? { users } : {}),
         ...(files ? { files } : {}),
         ...(latest
            ? {
                 latestChanges: latest.map((entry) => ({
                    id: entry.id,
                    createdAt: entry.createdAt,
                    action: entry.action,
                    resourceType: entry.resourceType,
                    resourceId: entry.resourceId,
                    actorType: entry.actorType,
                    actor: entry.user
                       ? {
                            id: entry.user.id,
                            name: `${entry.user.firstName} ${entry.user.lastName}`,
                         }
                       : null,
                 })),
              }
            : {}),
         omitted,
      };
   }
}
