import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the project to delete.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteProject',
   description:
      'Move a project to the trash (Koš). It disappears from the lists and the website at once; ' +
      'its translations, media, links and tags are kept, and it can be restored (`restoreProject`, ' +
      'it comes back as a draft) until it is purged after 30 days. Needs approval: the SDK pauses ' +
      'execution and renders a Smazat/Zrušit approval tile to the user — just call the tool with ' +
      'the target id; do not chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'project.trash', resourceType: 'project' },
})
@Injectable()
export class DeleteProjectTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { id }: Input) {
      try {
         await this.projectService.trash(id, ctx.user.id);
         return { id, trashed: true, restorable: true };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Project with id ${id} not found.`);
         }
         throw error;
      }
   }
}
