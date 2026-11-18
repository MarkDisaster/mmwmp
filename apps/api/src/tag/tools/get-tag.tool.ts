import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { adminEntityPath } from '@/ai/admin-routes';
import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { TagService } from '../tag.service';
import { tagName, toToolNames } from '../tag-translations';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the tag.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'getTag',
   description:
      'Get one tag by id: `name` (Czech), `names` (`cs` and `en`, null without an English name), slug, color, display order, dates and `adminUrl`. Use it ' +
      'for the tag of the current page context or before changing a tag whose id you have. Find ' +
      'the id by name with `findTags`.',
   inputSchema,
   permission: { resource: PermissionResource.tags, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class GetTagTool extends AiToolHandler<Input> {
   constructor(private readonly tagService: TagService) {
      super();
   }

   async execute(_ctx: ToolContext, { id }: Input) {
      let tag: Awaited<ReturnType<TagService['findOne']>>;
      try {
         tag = await this.tagService.findOne(id);
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Tag with id ${id} not found. Find the id with findTags.`);
         }
         throw error;
      }

      return {
         id: tag.id,
         name: tagName(tag),
         names: toToolNames(tag),
         slug: tag.slug,
         color: tag.color,
         sortOrder: tag.sortOrder,
         updatedAt: tag.updatedAt,
         createdAt: tag.createdAt,
         adminUrl: adminEntityPath('tag', tag.id),
      };
   }
}
