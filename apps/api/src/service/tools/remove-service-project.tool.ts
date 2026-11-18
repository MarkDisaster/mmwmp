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
   projectId: z.number().int().positive().describe('Numeric id of the project to unlink.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'removeServiceProject',
   description:
      'Unlink one project from a service and keep all its other projects. The project itself ' +
      'stays. Unlinking a project the service does not have changes nothing (`removed: false`). ' +
      'Returns the remaining projects of the service; `listServices` returns the current ' +
      '`projects` of each service.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'service', idField: 'serviceId' },
   editTarget: ({ serviceId }) => [{ entity: EditLockEntity.services, id: serviceId }],
   audit: {
      action: 'service.removeProject',
      resourceType: 'service',
      resourceIdFrom: ({ serviceId }) => serviceId,
   },
})
@Injectable()
export class RemoveServiceProjectTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(ctx: ToolContext, { serviceId, projectId }: Input) {
      try {
         const { removed, service } = await this.serviceService.removeProject(
            serviceId,
            projectId,
            toSaveActor(ctx.user, PermissionResource.services),
         );
         return {
            id: service.id,
            title: service.title,
            removed,
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
