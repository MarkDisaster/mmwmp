import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { EntityStatus, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';
import {
   BULK_PROJECTS_MAX,
   bulkProjectsSchema,
   doneIds,
   refused,
   runPerProject,
   verifyBulkInput,
} from './bulk-projects';

const inputSchema = z.object({
   projects: bulkProjectsSchema,
   status: z
      .enum([EntityStatus.draft, EntityStatus.published])
      .describe('Target status for every listed project.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateProjectsStatus',
   description:
      `Publish or unpublish up to ${BULK_PROJECTS_MAX} projects with ONE confirmation (use ` +
      '`updateProjectStatus` for a single project). Each item carries the project `title` so ' +
      'the approval tile lists names. Projects are changed one by one like the single call; a ' +
      'project that fails does not stop the others; titles are checked against the database first and ' +
      'a mismatch changes nothing (`applied: false`): `failed` lists each with its reason, ' +
      '`done` the changed ones. The change is visible on the public site. The user confirms ' +
      'in an approval tile; do not chat-ask first.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.publish },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: ({ projects }) =>
      projects.map(({ id }) => ({ entity: EditLockEntity.projects, id })),
   audit: {
      action: 'project.updateStatusMany',
      resourceType: 'project',
      resourceIdFrom: (_input, output) => doneIds(output),
   },
})
@Injectable()
export class UpdateProjectsStatusTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(_ctx: ToolContext, { projects, status }: Input) {
      const problems = await verifyBulkInput(this.projectService, projects);
      if (problems.length > 0) return { status, ...refused(problems) };
      const result = await runPerProject(projects, async ({ id }) => {
         await this.projectService.updateStatus(id, { status });
      });
      return { status, ...result };
   }
}
