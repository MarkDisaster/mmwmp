import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import { tagName } from '@/tag/tag-translations';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   projectId: z.number().int().positive().describe('Numeric id of the project.'),
   tagId: z.number().int().positive().describe('Numeric id of the tag to detach.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'removeProjectTag',
   description:
      'Detach one tag from a project and keep all its other tags. The tag itself stays (to delete ' +
      'it everywhere use `deleteTag`). Fails when the tag is not attached to the project — ' +
      '`listProjects` returns the current `tags` of each project. Returns the remaining tags.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: {
      action: 'project.removeTag',
      resourceType: 'project',
      resourceIdFrom: ({ projectId }) => projectId,
   },
})
@Injectable()
export class RemoveProjectTagTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, tagId }: Input) {
      try {
         await this.projectService.removeTag(
            projectId,
            tagId,
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         const project = await this.projectService.findOne(projectId);
         return {
            id: project.id,
            title: project.title,
            removed: true,
            tags: project.tags.map(({ tag }) => ({ id: tag.id, name: tagName(tag) })),
         };
      } catch (error) {
         if (error instanceof NotFoundException || error instanceof ConflictException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
