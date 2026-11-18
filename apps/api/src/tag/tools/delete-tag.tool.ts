import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { TagService } from '../tag.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the tag to delete.'),
   currentName: z
      .string()
      .min(1)
      .describe(
         'The CURRENT Czech name of the tag, exactly as `findTags` / `getTag` returned it (`name`). ' +
            'The approval tile shows it so the user sees which tag is deleted; a mismatch changes nothing.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteTag',
   description:
      'Move a tag to the trash (Koš). It disappears from the tag lists, the pickers, the projects ' +
      'and the website, but stays attached to its projects: `restoreTag` puts it back on them ' +
      'again. Purged after 30 days. Needs approval: the SDK pauses execution and renders a ' +
      'Smazat/Zrušit approval tile to the user — just call the tool with the target id and `currentName`; do not ' +
      'chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.tags, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'tag.trash', resourceType: 'tag' },
})
@Injectable()
export class DeleteTagTool extends AiToolHandler<Input> {
   constructor(private readonly tagService: TagService) {
      super();
   }

   async execute(ctx: ToolContext, { id, currentName }: Input) {
      try {
         await this.tagService.trash(id, ctx.user.id, currentName);
         return { id, trashed: true, restorable: true };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Tag with id ${id} not found.`);
         }
         throw error;
      }
   }
}
