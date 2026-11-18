import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ServiceService } from '../service.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the service to delete.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteService',
   description:
      'Move a service to the trash (Koš). It disappears from the lists and the website at once; its ' +
      'translations and project links are kept, and it can be restored (`restoreService`, it comes ' +
      'back as a draft) until it is purged after 30 days. Needs approval: the SDK pauses execution ' +
      'and renders a Smazat/Zrušit approval tile to the user — just call the tool with the target ' +
      'id; do not chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'service.trash', resourceType: 'service' },
})
@Injectable()
export class DeleteServiceTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(ctx: ToolContext, { id }: Input) {
      try {
         await this.serviceService.trash(id, ctx.user.id);
         return { id, trashed: true, restorable: true };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Service with id ${id} not found.`);
         }
         throw error;
      }
   }
}
