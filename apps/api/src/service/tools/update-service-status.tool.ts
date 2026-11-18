import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { EntityStatus, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ServiceService } from '../service.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the service to update.'),
   status: z
      .enum([EntityStatus.draft, EntityStatus.published])
      .describe('Target publication status — `published` makes it live, `draft` hides it.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateServiceStatus',
   description:
      'Publish or unpublish a service. Setting status to `published` stamps the publish date; ' +
      '`draft` clears the publish date and hides the service from the public site. ' +
      'Use `listServices` first if you need to find the id from a title or slug. The change is ' +
      'visible on the public site: the user confirms the call in an approval tile.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.publish },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: ({ id }) => [{ entity: EditLockEntity.services, id }],
   audit: { action: 'service.updateStatus', resourceType: 'service' },
})
@Injectable()
export class UpdateServiceStatusTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(_ctx: ToolContext, { id, status }: Input) {
      try {
         const service = await this.serviceService.updateStatus(id, { status });
         return {
            id: service.id,
            title: service.title,
            status: service.status,
            publishedAt: service.publishedAt,
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Service with id ${id} not found.`);
         }
         throw error;
      }
   }
}
