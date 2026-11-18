import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { MOVE_POSITIONS } from '@/common/sort/move-positions';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ServiceService } from '../service.service';

const inputSchema = z.object({
   serviceId: z.number().int().positive().describe('The service to move'),
   targetServiceId: z.number().int().positive().describe('The service to place it next to'),
   position: z
      .enum(MOVE_POSITIONS)
      .describe('`before` puts the service directly above the target, `after` directly below it'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'moveService',
   description:
      'Change the display order of one service: place it directly before or after another ' +
      'service. The other services keep their relative order. First call `listServices` with ' +
      '`sortBy: "sortOrder"` and `limit: 100` to see the services in display order. To make a ' +
      'service the first one, place it `before` the first service in that list; to make it the ' +
      'last one, place it `after` the last service.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'service', idField: 'serviceId' },
   editTarget: ({ serviceId }) => [{ entity: EditLockEntity.services, id: serviceId }],
   audit: {
      action: 'service.move',
      resourceType: 'service',
      resourceIdFrom: (input: Input) => input.serviceId,
   },
})
@Injectable()
export class MoveServiceTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(ctx: ToolContext, { serviceId, targetServiceId, position }: Input) {
      await this.serviceService.move(
         serviceId,
         { targetId: targetServiceId, position },
         toSaveActor(ctx.user, PermissionResource.services),
      );
      return { serviceId, targetServiceId, position, moved: true };
   }
}
