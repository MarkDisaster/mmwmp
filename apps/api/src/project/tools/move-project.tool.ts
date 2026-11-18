import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { MOVE_POSITIONS } from '@/common/sort/move-positions';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   projectId: z.number().int().positive().describe('The project to move'),
   targetProjectId: z.number().int().positive().describe('The project to place it next to'),
   position: z
      .enum(MOVE_POSITIONS)
      .describe('`before` puts the project directly above the target, `after` directly below it'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'moveProject',
   description:
      'Change the display order of one project: place it directly before or after another ' +
      'project. The other projects keep their relative order. First call `listProjects` with ' +
      '`sortBy: "sortOrder"` and `limit: 100` to see the projects in display order. To make a ' +
      'project the first one, place it `before` the first project in that list; to make it the ' +
      'last one, place it `after` the last project.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: {
      action: 'project.move',
      resourceType: 'project',
      resourceIdFrom: (input: Input) => input.projectId,
   },
})
@Injectable()
export class MoveProjectTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, targetProjectId, position }: Input) {
      await this.projectService.move(
         projectId,
         { targetId: targetProjectId, position },
         toSaveActor(ctx.user, PermissionResource.projects),
      );
      return { projectId, targetProjectId, position, moved: true };
   }
}
