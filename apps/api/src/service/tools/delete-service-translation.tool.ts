import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ServiceService } from '../service.service';

const inputSchema = z.object({
   serviceId: z.number().int().positive().describe('Numeric id of the service.'),
   language: z.enum([Language.cs, Language.en]).describe('Language of the translation to remove.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteServiceTranslation',
   description:
      'Remove one language variant from a service. The service itself stays — only the CS or EN ' +
      'translation row is deleted. The last translation with a title cannot be deleted. ' +
      '**Destructive — irreversible.** The SDK pauses execution and ' +
      'renders a Smazat/Zrušit approval tile to the user — just call the tool with the target ids; ' +
      'do not chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.update },
   behavior: 'destructive',
   audit: {
      action: 'service.deleteTranslation',
      resourceType: 'service',
      resourceIdFrom: ({ serviceId }) => serviceId,
   },
})
@Injectable()
export class DeleteServiceTranslationTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(ctx: ToolContext, { serviceId, language }: Input) {
      try {
         await this.serviceService.deleteTranslation(
            serviceId,
            language,
            toSaveActor(ctx.user, PermissionResource.services),
         );
         return { serviceId, language, deleted: true };
      } catch (error) {
         if (error instanceof NotFoundException || error instanceof BadRequestException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
