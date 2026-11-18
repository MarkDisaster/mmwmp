import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   projectId: z.number().int().positive().describe('Numeric id of the project.'),
   tagIds: z
      .array(z.number().int().positive())
      .min(1)
      .describe('Full ordered array of tag ids. Must contain every tag of the project once.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'sortProjectTags',
   description:
      'Reorder the tags of a project. `tagIds` defines the new display order and must contain every ' +
      'tag the project has exactly once (no add or remove, only reorder). Call `getProject` first: ' +
      'its `tags` lists the current ids in the current order. Never guess the ids.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: {
      action: 'project.sortTags',
      resourceType: 'project',
      resourceIdFrom: ({ projectId }) => projectId,
   },
})
@Injectable()
export class SortProjectTagsTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, tagIds }: Input) {
      try {
         await this.projectService.sortTags(
            projectId,
            { tagIds },
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return { projectId, tagIds, reordered: true };
      } catch (error) {
         if (error instanceof NotFoundException || error instanceof BadRequestException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
