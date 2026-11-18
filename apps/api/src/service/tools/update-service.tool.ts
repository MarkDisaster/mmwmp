import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ServiceService } from '../service.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the service to update.'),
   slug: z
      .string()
      .regex(SLUG_REGEX, `${SLUG_MESSAGE}.`)
      .optional()
      .describe('New URL-friendly slug. Must stay unique among services.'),
   showOnHomepage: z
      .boolean()
      .optional()
      .describe('Whether to show this service in the homepage services section.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateService',
   description:
      'Update non-translated metadata of a service: slug or homepage visibility. ' +
      'Pass only the fields you want to change; omitted fields stay as they are. ' +
      'To change the display order use `moveService`. Title, description and content live in the ' +
      'service translation row — use ' +
      '`upsertServiceTranslation` for those, picking the language explicitly.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'service', idField: 'id' },
   editTarget: ({ id }) => [{ entity: EditLockEntity.services, id }],
   audit: { action: 'service.update', resourceType: 'service' },
})
@Injectable()
export class UpdateServiceTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(ctx: ToolContext, { id, slug, showOnHomepage }: Input) {
      try {
         const service = await this.serviceService.update(
            id,
            {
               slug,
               showOnHomepage,
            },
            toSaveActor(ctx.user, PermissionResource.services),
         );
         return {
            id: service.id,
            title: service.title,
            slug: service.slug,
            sortOrder: service.sortOrder,
            showOnHomepage: service.showOnHomepage,
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Service with id ${id} not found.`);
         }
         throw error;
      }
   }
}
