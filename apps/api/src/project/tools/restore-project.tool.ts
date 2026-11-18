import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the project in the trash.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'restoreProject',
   description:
      'Take a project out of the trash (Koš). It comes back as a draft (never published again silently), at the end of the order, with its original slug; fails when another project has that slug now. ' +
      'Use `listTrash` to find the id. Needs approval: the SDK pauses execution and renders an ' +
      'approval tile to the user — just call the tool with the target id.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'project.restore', resourceType: 'project' },
})
@Injectable()
export class RestoreProjectTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(_ctx: ToolContext, { id }: Input) {
      try {
         await this.projectService.restore(id);
         return { id, restored: true, status: 'draft' };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Project with id ${id} is not in the trash.`);
         }
         if (error instanceof ConflictException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
