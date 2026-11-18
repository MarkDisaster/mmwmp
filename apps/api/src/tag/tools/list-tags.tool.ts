import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { TagService } from '../tag.service';
import { tagName, toToolNames } from '../tag-translations';

const inputSchema = z.object({
   search: z
      .string()
      .optional()
      .describe(
         'Optional case-insensitive substring search in the tag names (Czech and English) and slug.',
      ),
   limit: z.number().int().min(1).max(TOOL_LIST_MAX_LIMIT).optional(),
   sortBy: z
      .enum(['updatedAt', 'sortOrder'])
      .optional()
      .describe(
         '`updatedAt` (default): last changed first. `sortOrder`: global display order, first shown first.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'listTags',
   description:
      'List all tags from the admin database. Returns id, `name` (Czech), `names` (`cs` and `en`, null when the tag has no English name), slug, color, `sortOrder` (global display position, lower first) and dates. Ordered by last change by default; pass `sortBy: "sortOrder"` for the display order.',
   inputSchema,
   permission: { resource: PermissionResource.tags, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class ListTagsTool extends AiToolHandler<Input> {
   constructor(private readonly tagService: TagService) {
      super();
   }

   async execute(_ctx: ToolContext, { search, limit, sortBy = 'updatedAt' }: Input) {
      const result = await this.tagService.findAll({
         page: 0,
         limit: Math.min(limit ?? TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT),
         search,
         sortOrder: sortBy === 'sortOrder' ? 'asc' : 'desc',
         sortBy,
      });
      return {
         total: result.totalCount,
         items: result.data.map((t) => ({
            id: t.id,
            name: tagName(t),
            names: toToolNames(t),
            slug: t.slug,
            color: t.color,
            sortOrder: t.sortOrder,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
         })),
      };
   }
}
