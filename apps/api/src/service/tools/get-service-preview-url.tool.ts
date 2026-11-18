import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import { PreviewService } from '@/preview/preview.service';

import { ServiceService } from '../service.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the service.'),
   locale: z
      .enum([Language.cs, Language.en])
      .optional()
      .describe('Language of the preview. Defaults to `cs`.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'getServicePreviewUrl',
   description:
      'A link that opens the draft of a service on the public web in the given language ' +
      '(`previewUrl`). The signed link expires after 5 minutes: ask for a new one for each ' +
      'preview and give it to the user as a link right away. Find the id with `findServices`.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class GetServicePreviewUrlTool extends AiToolHandler<Input> {
   constructor(
      private readonly serviceService: ServiceService,
      private readonly previewService: PreviewService,
   ) {
      super();
   }

   async execute(_ctx: ToolContext, { id, locale }: Input) {
      try {
         const service = await this.serviceService.findOne(id);
         return {
            previewUrl: this.previewService.getPreviewUrl('services', service, locale ?? 'cs'),
            expiresInMinutes: 5,
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Service with id ${id} not found.`);
         }
         throw error;
      }
   }
}
