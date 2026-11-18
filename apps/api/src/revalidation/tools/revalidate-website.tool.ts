import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { REVALIDATION_TAGS, RevalidationService } from '../revalidation.service';

const inputSchema = z.object({
   tags: z
      .array(z.enum(REVALIDATION_TAGS))
      .min(1)
      .max(REVALIDATION_TAGS.length)
      .refine((tags) => new Set(tags).size === tags.length, {
         message: 'Each tag may appear only once.',
      })
      .describe(
         'What to refresh: `projects`, `services`, `tags` or `contact` (the data of that kind on ' +
            'the public web). Pass only what the user named; all four only for "obnov celý web".',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'revalidateWebsite',
   description:
      'Refresh the cache of the public website (marek.media) for the given tags, so visitors ' +
      'see the current data now ("obnov web", "na webu je stará verze"). The BE already does ' +
      'this after every content change, so use it only when the user reports a stale page or ' +
      'asks for it, not after your own edits. It changes no data. Returns per tag whether the ' +
      'web accepted it (`revalidated`) and else a `reason`; a failed tag means the web was ' +
      'unreachable or misconfigured: say so. Pages refresh on their next visit, not all at ' +
      'once. The user confirms the call in an approval tile; do not chat-ask for confirmation ' +
      'first. Needs the publish permission (projects.publish).',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.publish },
   behavior: 'mutating',
   needsApproval: true,
   audit: { action: 'website.revalidate', resourceType: 'website' },
})
@Injectable()
export class RevalidateWebsiteTool extends AiToolHandler<Input> {
   constructor(private readonly revalidation: RevalidationService) {
      super();
   }

   async execute(_ctx: ToolContext, { tags }: Input) {
      const results = await this.revalidation.revalidateNow(tags);
      if (results.every((result) => !result.revalidated)) {
         throw new Error(
            'The web was not refreshed: ' +
               results.map(({ tag, reason }) => `${tag}: ${reason ?? 'unknown'}`).join('; '),
         );
      }
      return { allRevalidated: results.every((result) => result.revalidated), results };
   }
}
