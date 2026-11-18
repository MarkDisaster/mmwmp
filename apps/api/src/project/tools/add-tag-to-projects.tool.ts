import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

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
   tagId: z.number().int().positive().describe('Numeric id of the tag, from `findTags`.'),
   tagName: z
      .string()
      .describe(
         'Czech name of that tag (`name` from `findTags`, shown in the approval tile; checked against the database).',
      ),
   projects: bulkProjectsSchema,
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'addTagToProjects',
   description:
      `Attach one tag to up to ${BULK_PROJECTS_MAX} projects with ONE confirmation ` +
      '(`addProjectTag` for a single project). Existing tags of each project stay; the tag goes ' +
      'last; a project that already has it is left as is. Projects are changed one by one: a ' +
      'failure (e.g. a published project without the publish permission) is listed in `failed` ' +
      'and does not stop the others. Titles and the tag name are checked against the database first; a mismatch changes nothing (`applied: false`). The user confirms in an approval tile; do not chat-ask first.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: ({ projects }) =>
      projects.map(({ id }) => ({ entity: EditLockEntity.projects, id })),
   audit: {
      action: 'project.addTagMany',
      resourceType: 'project',
      resourceIdFrom: ({ tagId }, output) => {
         const ids = doneIds(output);
         return ids === null ? null : `tag:${tagId} projects:${ids}`;
      },
   },
})
@Injectable()
export class AddTagToProjectsTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { tagId, tagName, projects }: Input) {
      const problems = await verifyBulkInput(this.projectService, projects, { tagId, tagName });
      if (problems.length > 0) return { tagId, tagName, ...refused(problems) };
      const actor = toSaveActor(ctx.user, PermissionResource.projects);
      const result = await runPerProject(projects, async ({ id }) => {
         await this.projectService.addTag(id, tagId, actor);
      });
      return { tagId, tagName, ...result };
   }
}
