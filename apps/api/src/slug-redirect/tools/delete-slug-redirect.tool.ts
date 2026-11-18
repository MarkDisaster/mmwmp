import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { SlugRedirectService } from '../slug-redirect.service';
import {
   assertSlugRedirectPermission,
   SLUG_REDIRECT_RESOURCES,
   slugRedirectTypeSchema,
} from './slug-redirect-types';

const inputSchema = z.object({
   type: slugRedirectTypeSchema,
   id: z.number().int().positive().describe('Id of the redirect, from `listSlugRedirects`.'),
   oldSlug: z
      .string()
      .min(1)
      .describe(
         'The `oldSlug` of that redirect exactly as `listSlugRedirects` returned it. It is shown ' +
            'to the user in the approval tile and checked: a redirect that is another slug now ' +
            'is not deleted.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteSlugRedirect',
   description:
      'Delete one slug redirect of a project or service: the old address (`oldSlug`) answers ' +
      '404 from now on instead of redirecting to the current one. **Irreversible** (a redirect ' +
      'only comes back when the row is renamed again, and links and search results that still ' +
      'use the old address break). Find the id and `oldSlug` with `listSlugRedirects` and ' +
      'mention the effect to the user before the call. The user confirms the call in an ' +
      'approval tile; do not chat-ask for confirmation first. It changes a live address of the ' +
      'web, so it needs the PUBLISH permission of the chosen type (like the REST route); ' +
      'because the registry checks one static grant, the caller needs `projects.publish` for ' +
      'both types and `<type>.publish` of the chosen one on top.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.publish },
   behavior: 'mutating',
   needsApproval: true,
   audit: { action: 'slugRedirect.delete', resourceType: 'slugRedirect' },
})
@Injectable()
export class DeleteSlugRedirectTool extends AiToolHandler<Input> {
   constructor(private readonly slugRedirects: SlugRedirectService) {
      super();
   }

   async execute(ctx: ToolContext, { type, id, oldSlug }: Input) {
      assertSlugRedirectPermission(ctx, type, PermissionAction.publish);
      try {
         const removed = await this.slugRedirects.remove(
            SLUG_REDIRECT_RESOURCES[type],
            id,
            oldSlug,
         );
         return { type, id: removed.id, oldSlug: removed.oldSlug, deleted: true };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`There is no ${type} slug redirect with id ${id}.`);
         }
         if (error instanceof ConflictException) {
            throw new Error(`${error.message}. List the redirects again.`);
         }
         throw error;
      }
   }
}
