import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { TagService } from '../tag.service';
import { toToolTag } from './tag-tool-output';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the tag in the trash.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'restoreTag',
   description:
      'Take a tag out of the trash (Koš). It comes back with its original slug and names (Czech and English), on the projects it was attached to; fails when another tag has that slug now. ' +
      'Use `listTrash` to find the id. Needs approval: the SDK pauses execution and renders an ' +
      'approval tile to the user — just call the tool with the target id.',
   inputSchema,
   permission: { resource: PermissionResource.tags, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'tag.restore', resourceType: 'tag' },
})
@Injectable()
export class RestoreTagTool extends AiToolHandler<Input> {
   constructor(private readonly tagService: TagService) {
      super();
   }

   async execute(_ctx: ToolContext, { id }: Input) {
      try {
         const tag = await this.tagService.restore(id);
         return { ...toToolTag(tag), restored: true };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Tag with id ${id} is not in the trash.`);
         }
         if (error instanceof ConflictException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
