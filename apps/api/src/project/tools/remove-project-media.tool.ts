import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   projectId: z.number().int().positive().describe('Numeric id of the project.'),
   mediaId: z
      .number()
      .int()
      .positive()
      .describe(
         'Numeric id of the project-media association (NOT the file id). The file itself stays in the library.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'removeProjectMedia',
   description:
      'Detach a media item from a project. The underlying file in the file library is NOT deleted ' +
      '— only the association with this project. To delete the file itself, use `deleteFile`. ' +
      'The `mediaId` is the id of the project-media association, not the file id: read it from ' +
      '`media` of `getProject` (or the output of `addProjectMedia`); never guess it.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: {
      action: 'project.removeMedia',
      resourceType: 'project',
      resourceIdFrom: ({ projectId }) => projectId,
   },
})
@Injectable()
export class RemoveProjectMediaTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, mediaId }: Input) {
      try {
         await this.projectService.removeMedia(
            projectId,
            mediaId,
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return { projectId, mediaId, removed: true };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
