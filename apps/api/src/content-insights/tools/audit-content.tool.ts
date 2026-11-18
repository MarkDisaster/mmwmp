import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { AUDIT_DRAFT_MAX_DAYS, AUDIT_SAMPLE_SIZE } from '@/ai/tools/limits';
import { hasToolPermission, type ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ContentAuditService } from '../content-audit.service';

const DEFAULT_DRAFT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const PARTS = ['projects', 'services', 'files'] as const;
const PART_RESOURCE = {
   projects: PermissionResource.projects,
   services: PermissionResource.services,
   files: PermissionResource.files,
} as const;

const inputSchema = z.object({
   parts: z
      .array(z.enum(PARTS))
      .min(1)
      .optional()
      .describe('Which parts to audit. Omit for all three (`projects`, `services`, `files`).'),
   draftOlderThanDays: z
      .number()
      .int()
      .min(1)
      .max(AUDIT_DRAFT_MAX_DAYS)
      .optional()
      .describe(
         `A draft counts as old when it was created more than this many days ago. Default ${DEFAULT_DRAFT_DAYS}.`,
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'auditContent',
   description:
      'Content quality audit of the admin data ("zkontroluj obsah", "co chybí na webu", "SEO ' +
      'audit"). Per category an exact `total` and a sample of at most ' +
      `${AUDIT_SAMPLE_SIZE} items, each with \`name\` and \`adminUrl\` (link them in the answer). ` +
      'Projects: `withoutEnTranslation`, `withoutMetaTitle` / `withoutMetaDescription` (`detail` ' +
      'names the languages that lack it), `withoutThumbnail`, `withoutDescription`, `oldDrafts` ' +
      '(drafts created more than `draftOlderThanDays` ago), `publishedWithEmptyContent`. ' +
      'Services: the same without the thumbnail and description. Files: `imagesWithoutAltText` ' +
      '(feed it into `viewFileImage` and `updateFiles` to fill them) and `unused` (attached to ' +
      'no project, with `totalSizeBytes`; the same list as `findUnusedFiles`, which pages ' +
      'through all of them). Only live rows are counted, the trash is excluded. A part the ' +
      'caller may not read (projects.read, services.read, files.read) is left out and named in ' +
      '`omitted`: tell the user. A sample is not the whole list: when `total` exceeds it, say ' +
      'so and offer to continue with the dedicated list tools.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class AuditContentTool extends AiToolHandler<Input> {
   constructor(private readonly audit: ContentAuditService) {
      super();
   }

   async execute(ctx: ToolContext, { parts, draftOlderThanDays }: Input) {
      const requested = parts ?? PARTS;
      const allowed = requested.filter((part) =>
         hasToolPermission(ctx, PART_RESOURCE[part], PermissionAction.read),
      );
      const omitted = requested
         .filter((part) => !allowed.includes(part))
         .map((part) => ({ part, missingPermission: `${PART_RESOURCE[part]}.read` }));

      const days = draftOlderThanDays ?? DEFAULT_DRAFT_DAYS;
      const draftCutoff = new Date(Date.now() - days * DAY_MS);
      const [projects, services, files] = await Promise.all([
         allowed.includes('projects') ? this.audit.auditProjects(draftCutoff) : undefined,
         allowed.includes('services') ? this.audit.auditServices(draftCutoff) : undefined,
         allowed.includes('files') ? this.audit.auditFiles() : undefined,
      ]);

      return {
         draftOlderThanDays: days,
         sampleSize: AUDIT_SAMPLE_SIZE,
         ...(projects ? { projects } : {}),
         ...(services ? { services } : {}),
         ...(files ? { files } : {}),
         omitted,
      };
   }
}
