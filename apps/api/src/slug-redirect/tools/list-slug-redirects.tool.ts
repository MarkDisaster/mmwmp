import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { adminEntityPath } from '@/ai/admin-routes';
import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
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
   search: z.string().optional().describe('Case-insensitive substring of the old slug.'),
   page: z.number().int().min(0).optional().describe('Page number, 0-indexed. Defaults to 0.'),
   limit: z.number().int().min(1).max(TOOL_LIST_MAX_LIMIT).optional(),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'listSlugRedirects',
   description:
      'List the old slugs of projects or services that still redirect (permanently) to the ' +
      'current address, newest first: id, `oldSlug`, the target (`targetTitle`, `targetSlug`, ' +
      '`targetState`, `adminUrl`) and when it was created. A redirect appears when a published ' +
      'row gets a new slug. `targetState` other than `published` means the old address answers ' +
      '404 anyway (a draft or trashed target): that redirect is dead. Delete one with ' +
      '`deleteSlugRedirect`, after the user agrees. `total` is the number of matches: page ' +
      'through them (`page`) when it exceeds `limit`. The caller needs the read permission of ' +
      'the chosen type; because the registry checks one static grant, `projects.read` is ' +
      'needed for both types (stricter than the REST route of services).',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class ListSlugRedirectsTool extends AiToolHandler<Input> {
   constructor(private readonly slugRedirects: SlugRedirectService) {
      super();
   }

   async execute(ctx: ToolContext, { type, search, page, limit }: Input) {
      assertSlugRedirectPermission(ctx, type, PermissionAction.read);
      const result = await this.slugRedirects.findAll(SLUG_REDIRECT_RESOURCES[type], {
         page: page ?? 0,
         limit: Math.min(limit ?? TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT),
         search,
      });
      return {
         type,
         total: result.totalCount,
         items: result.data.map((row) => ({
            id: row.id,
            oldSlug: row.oldSlug,
            targetId: row.targetId,
            targetTitle: row.targetTitle,
            targetSlug: row.targetSlug,
            targetState: row.targetState,
            adminUrl: row.targetState === 'missing' ? null : adminEntityPath(type, row.targetId),
            createdAt: row.createdAt,
         })),
      };
   }
}
