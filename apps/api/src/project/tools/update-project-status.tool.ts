import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { EntityStatus, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the project to update.'),
   status: z
      .enum([EntityStatus.draft, EntityStatus.published])
      .describe('Target publication status — `published` makes it live, `draft` hides it.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateProjectStatus',
   description:
      'Publish or unpublish a project. Setting status to `published` stamps the publish date; ' +
      'setting it to `draft` clears the publish date and hides the project from the public site. ' +
      'Use `listProjects` first if you need to find the id from a title or slug. The change is ' +
      'visible on the public site: the user confirms the call in an approval tile.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.publish },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: ({ id }) => [{ entity: EditLockEntity.projects, id }],
   audit: { action: 'project.updateStatus', resourceType: 'project' },
})
@Injectable()
export class UpdateProjectStatusTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(_ctx: ToolContext, { id, status }: Input) {
      try {
         const project = await this.projectService.updateStatus(id, { status });
         return {
            id: project.id,
            title: project.title,
            status: project.status,
            publishedAt: project.publishedAt,
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Project with id ${id} not found.`);
         }
         throw error;
      }
   }
}
