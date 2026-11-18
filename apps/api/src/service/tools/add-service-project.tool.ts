import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
   projectId: z.number().int().positive().describe('Numeric id of the project to link.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'addServiceProject',
   description:
      'Link one project to a service and keep all its other projects; the new project goes last ' +
      'in the display order. Linking a project the service already has changes nothing ' +
      '(`added: false`). Returns the resulting projects of the service. Use `listProjects` to ' +
      'find the project id and `listServices` to find the service id.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'service', idField: 'serviceId' },
   editTarget: ({ serviceId }) => [{ entity: EditLockEntity.services, id: serviceId }],
   audit: {
      action: 'service.addProject',
      resourceType: 'service',
      resourceIdFrom: ({ serviceId }) => serviceId,
   },
})
@Injectable()
export class AddServiceProjectTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(ctx: ToolContext, { serviceId, projectId }: Input) {
      try {
         const { added, service } = await this.serviceService.addProject(
            serviceId,
            projectId,
            toSaveActor(ctx.user, PermissionResource.services),
         );
         return {
            id: service.id,
            title: service.title,
            added,
            projects: toLinkedProjects(service.projects),
         };
      } catch (error) {
         if (error instanceof NotFoundException || error instanceof ConflictException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
