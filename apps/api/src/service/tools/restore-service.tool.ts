import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ServiceService } from '../service.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the service in the trash.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'restoreService',
   description:
      'Take a service out of the trash (Koš). It comes back as a draft, at the end of the order, with its original slug; fails when another service has that slug now. ' +
      'Use `listTrash` to find the id. Needs approval: the SDK pauses execution and renders an ' +
      'approval tile to the user — just call the tool with the target id.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'service.restore', resourceType: 'service' },
})
@Injectable()
export class RestoreServiceTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(_ctx: ToolContext, { id }: Input) {
      try {
         await this.serviceService.restore(id);
         return { id, restored: true, status: 'draft' };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Service with id ${id} is not in the trash.`);
         }
         if (error instanceof ConflictException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
