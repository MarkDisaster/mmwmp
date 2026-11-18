import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { httpUrlSchema } from '@/common/schema/http-url.schema';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { MAX_LINK_LABEL_LENGTH, MAX_PROJECT_LINKS } from '../project.constants';
import { ProjectService } from '../project.service';

const inputSchema = z.object({
   projectId: z.number().int().positive().describe('Numeric id of the project.'),
   links: z
      .array(
         z.object({
            label: z
               .string()
               .max(MAX_LINK_LABEL_LENGTH)
               .nullable()
               .optional()
               .describe('Visible text, e.g. "GitHub". Omit or `null` to show the domain instead.'),
            url: httpUrlSchema.describe(
               'Absolute http(s) URL with a domain name, e.g. https://github.com/user/repo.',
            ),
         }),
      )
      .max(MAX_PROJECT_LINKS)
      .describe(
         'Full ordered list of the project links; the first one is the main project link and ' +
            'the web shows them in this order. Replaces the current links; pass an empty array ' +
            'to remove all of them.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'setProjectLinks',
   description:
      'Set the links of a project (live site, GitHub, case study, Storybook…). The first link ' +
      'is the main project link. This REPLACES the whole list — to add one link, take the ' +
      'current links from `listProjects` first and send them together with the new one, in the ' +
      'order they should have.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: {
      action: 'project.assignLinks',
      resourceType: 'project',
      resourceIdFrom: ({ projectId }) => projectId,
   },
})
@Injectable()
export class SetProjectLinksTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, links }: Input) {
      try {
         const project = await this.projectService.assignLinks(
            projectId,
            { links },
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return {
            projectId,
            links: project.links.map(({ label, url }) => ({ label, url })),
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Project with id ${projectId} not found.`);
         }
         throw error;
      }
   }
}
