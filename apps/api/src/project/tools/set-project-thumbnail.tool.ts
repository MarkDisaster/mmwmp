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
   fileId: z
      .number()
      .int()
      .positive()
      .nullable()
      .describe(
         'Numeric id of the file to use as thumbnail. Pass `null` to clear the existing thumbnail.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'setProjectThumbnail',
   description:
      'Set or clear a project thumbnail. The thumbnail is the cover image shown in lists ' +
      'and on the public site — separate from `projectMedia` (the gallery). The file must ' +
      'already exist in the file library; use `listFiles` to find a `fileId`, or take the ' +
      '`fileId` from an attached file in the current message. ' +
      'Pass `fileId: null` to clear the thumbnail (no cover image).',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: { action: 'project.update', resourceType: 'project' },
})
@Injectable()
export class SetProjectThumbnailTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, fileId }: Input) {
      try {
         const project = await this.projectService.update(
            projectId,
            { thumbnailId: fileId },
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return {
            id: project.id,
            title: project.title,
            thumbnailId: project.thumbnailId,
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
