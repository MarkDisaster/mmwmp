import { Injectable, NotFoundException } from '@nestjs/common';
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
   tagIds: z
      .array(z.number().int().positive())
      .describe(
         'Full new set of tag ids, in display order. Empty array detaches all tags from the project.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'assignProjectTags',
   description:
      'Replace the full set of tags attached to a project: tags not in the array are detached, ' +
      'missing ones are attached, and the array order becomes the display order on the public ' +
      'site. An empty array removes all tags. Read the current `tags` from `listProjects` first ' +
      'and send the complete set. To attach or detach a single tag use `addProjectTag` / ' +
      '`removeProjectTag` instead, they keep the rest. Use `listTags` to find tag ids by name.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: { action: 'project.assignTags', resourceType: 'project' },
})
@Injectable()
export class AssignProjectTagsTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, tagIds }: Input) {
      try {
         const project = await this.projectService.assignTags(
            projectId,
            { tagIds },
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return {
            id: project.id,
            title: project.title,
            tags: project.tags.map(({ tag }) => ({ id: tag.id, name: tagName(tag) })),
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
