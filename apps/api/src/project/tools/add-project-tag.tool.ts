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
   tagId: z.number().int().positive().describe('Numeric id of the tag to attach.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'addProjectTag',
   description:
      'Attach one tag to a project and keep all its other tags; the new tag goes last in the ' +
      'display order. Attaching a tag the project already has changes nothing (`added: false`). ' +
      'Returns the resulting tags of the project. Use `listTags` to find the tag id by name and ' +
      '`listProjects` to find the project id.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: {
      action: 'project.addTag',
      resourceType: 'project',
      resourceIdFrom: ({ projectId }) => projectId,
   },
})
@Injectable()
export class AddProjectTagTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, tagId }: Input) {
      try {
         const { added, project } = await this.projectService.addTag(
            projectId,
            tagId,
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return {
            id: project.id,
            title: project.title,
            added,
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
