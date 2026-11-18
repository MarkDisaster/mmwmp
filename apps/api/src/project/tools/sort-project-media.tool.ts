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
   mediaIds: z
      .array(z.number().int().positive())
      .min(1)
      .describe(
         'Full ordered array of media ids (NOT file ids). Must contain every current media item once.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'sortProjectMedia',
   description:
      "Reorder a project's media items. The provided array of `mediaId`s defines the new display " +
      'order; the BE requires the array to contain every existing mediaId exactly once (no add/remove, ' +
      'just reorder). Call `getProject` first: its `media` lists every current `mediaId` in the ' +
      'current order. Never guess the ids.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: {
      action: 'project.sortMedia',
      resourceType: 'project',
      resourceIdFrom: ({ projectId }) => projectId,
   },
})
@Injectable()
export class SortProjectMediaTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, mediaIds }: Input) {
      try {
         await this.projectService.sortMedia(
            projectId,
            { mediaIds },
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return { projectId, mediaIds, reordered: true };
      } catch (error) {
         if (error instanceof NotFoundException || error instanceof BadRequestException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
