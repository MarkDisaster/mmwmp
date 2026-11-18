import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { sourceLanguageNames } from '@/ai/translation';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ServiceService } from '../service.service';

const inputSchema = z.object({
   serviceId: z.number().int().positive().describe('Numeric id of the service.'),
   targetLanguage: z
      .enum([Language.cs, Language.en])
      .describe('Language to translate INTO; the other language of the service is the source.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'generateServiceTranslation',
   description:
      'Machine-translate a service from its other language into `targetLanguage` (CS <-> EN) ' +
      'and return the proposed fields: title, description, content. It does NOT save anything: ' +
      'show the result and save it with `upsertServiceTranslation` only when the user agrees. ' +
      'Every call runs a paid AI model, so call it only on the ' +
      "user's explicit request, once per service and language, never in a loop or for several " +
      'services at once unless the user asked for exactly those. The source language must ' +
      'already have a translation with a title. The user confirms each call in an approval tile.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: ({ serviceId }) => [{ entity: EditLockEntity.services, id: serviceId }],
   audit: {
      action: 'service.generateTranslation',
      resourceType: 'service',
      resourceIdFrom: ({ serviceId }) => serviceId,
   },
})
@Injectable()
export class GenerateServiceTranslationTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(ctx: ToolContext, { serviceId, targetLanguage }: Input) {
      try {
         const service = await this.serviceService.findOne(serviceId);
         const source = service.translations.find(
            (translation) => translation.language !== targetLanguage && translation.title.trim(),
         );
         if (!source) {
            throw new Error(
               `Service ${serviceId} has no ${sourceLanguageNames(targetLanguage)} ` +
                  'version with a title to translate from.',
            );
         }
         const generated = await this.serviceService.generateTranslation(
            serviceId,
            targetLanguage,
            { title: source.title, description: source.description, content: source.content },
            ctx.user.id,
         );
         return { serviceId, language: targetLanguage, saved: false, ...generated };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Service with id ${serviceId} not found.`);
         }
         throw error;
      }
   }
}
