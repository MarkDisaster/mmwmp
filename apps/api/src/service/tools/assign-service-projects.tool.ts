import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ServiceService } from '../service.service';
import { toLinkedProjects } from './linked-projects';

const inputSchema = z.object({
   serviceId: z.number().int().positive().describe('Numeric id of the service.'),
   projectIds: z
      .array(z.number().int().positive())
      .describe(
         'Full new set of project ids, in display order. Empty array unlinks all projects from the service.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'assignServiceProjects',
   description:
      'Replace the full set of projects linked to a service: projects not in the array are ' +
      'unlinked, missing ones are linked, and the array order becomes the display order on the ' +
      'public site. An empty array unlinks all projects. Read the current `projects` from ' +
      '`listServices` first and send the complete set. To link or unlink a single project use ' +
      '`addServiceProject` / `removeServiceProject` instead, they keep the rest.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'service', idField: 'serviceId' },
   editTarget: ({ serviceId }) => [{ entity: EditLockEntity.services, id: serviceId }],
   audit: { action: 'service.assignProjects', resourceType: 'service' },
})
@Injectable()
export class AssignServiceProjectsTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(ctx: ToolContext, { serviceId, projectIds }: Input) {
      try {
         const service = await this.serviceService.assignProjects(
            serviceId,
            { projectIds },
            toSaveActor(ctx.user, PermissionResource.services),
         );
         return {
            id: service.id,
            title: service.title,
            projects: toLinkedProjects(service.projects),
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
