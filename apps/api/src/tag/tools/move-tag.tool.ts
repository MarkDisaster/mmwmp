import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { MOVE_POSITIONS } from '@/common/sort/move-positions';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { TagService } from '../tag.service';

const inputSchema = z.object({
   tagId: z.number().int().positive().describe('The tag to move'),
   targetTagId: z.number().int().positive().describe('The tag to place it next to'),
   position: z
      .enum(MOVE_POSITIONS)
      .describe('`before` puts the tag directly above the target, `after` directly below it'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'moveTag',
   description:
      'Change the global display order of one tag: place it directly before or after another ' +
      'tag. The other tags keep their relative order. First call `listTags` with ' +
      '`sortBy: "sortOrder"` and `limit: 100` to see the tags in display order. To make a ' +
      'tag the first one, place it `before` the first tag in that list; to make it the last ' +
      'one, place it `after` the last tag. The order of tags inside one project is separate ' +
      '(`assignProjectTags`).',
   inputSchema,
   permission: { resource: PermissionResource.tags, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: ({ tagId }) => [{ entity: EditLockEntity.tags, id: tagId }],
   audit: {
      action: 'tag.move',
      resourceType: 'tag',
      resourceIdFrom: (input: Input) => input.tagId,
   },
})
@Injectable()
export class MoveTagTool extends AiToolHandler<Input> {
   constructor(private readonly tagService: TagService) {
      super();
   }

   async execute(_ctx: ToolContext, { tagId, targetTagId, position }: Input) {
      await this.tagService.move(tagId, { targetId: targetTagId, position });
      return { tagId, targetTagId, position, moved: true };
   }
}
