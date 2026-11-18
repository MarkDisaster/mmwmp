import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { RICH_TEXT_HTML_HINT } from '@/common/sanitize/sanitize-rich-text';
import { toSaveActor } from '@/common/save/save-actor';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { UpsertServiceTranslationDto } from '../dto/upsert-service-translation.dto';
import { ServiceService } from '../service.service';

const inputSchema = z.object({
   serviceId: z.number().int().positive().describe('Numeric id of the service.'),
   language: z.enum([Language.cs, Language.en]).describe('Target language of the translation.'),
   title: z
      .string()
      .min(1)
      .optional()
      .describe(
         'Service title in this language. Required when creating a new translation; omit to keep current on existing rows.',
      ),
   description: z
      .string()
      .nullable()
      .optional()
      .describe('Short description. Omit to keep current, `null` to clear.'),
   content: z
      .string()
      .nullable()
      .optional()
      .describe(
         'Full content (rich HTML allowed; sanitized server-side). ' +
            `${RICH_TEXT_HTML_HINT} Omit to keep current, \`null\` to clear.`,
      ),
   metaTitle: z
      .string()
      .nullable()
      .optional()
      .describe('SEO meta title. Omit to keep current, `null` to clear.'),
   metaDescription: z
      .string()
      .nullable()
      .optional()
      .describe('SEO meta description. Omit to keep current, `null` to clear.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'upsertServiceTranslation',
   description:
      'Create or update a service translation in one language (CS or EN). Translation fields: ' +
      'title, description, content (rich HTML), metaTitle, metaDescription. Pass only the fields you want to change — omitted ' +
      'fields stay as they are; `null` clears a field. When creating a brand new translation row, ' +
      '`title` is required. Ask the user which language unless explicit.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'service', idField: 'serviceId' },
   editTarget: ({ serviceId }) => [{ entity: EditLockEntity.services, id: serviceId }],
   audit: {
      action: 'service.upsertTranslation',
      resourceType: 'service',
      resourceIdFrom: ({ serviceId }) => serviceId,
   },
})
@Injectable()
export class UpsertServiceTranslationTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(
      ctx: ToolContext,
      { serviceId, language, title, description, content, metaTitle, metaDescription }: Input,
   ) {
      const partial: Partial<UpsertServiceTranslationDto> = {};
      if (title !== undefined) partial.title = title;
      if (description !== undefined) partial.description = description ?? '';
      if (content !== undefined) partial.content = content ?? '';
      if (metaTitle !== undefined) partial.metaTitle = metaTitle ?? '';
      if (metaDescription !== undefined) partial.metaDescription = metaDescription ?? '';

      try {
         const result = await this.serviceService.upsertTranslation(
            serviceId,
            language,
            partial,
            toSaveActor(ctx.user, PermissionResource.services),
         );
         return {
            serviceId: result.serviceId,
            language: result.language,
            title: result.title,
            description: result.description,
            metaTitle: result.metaTitle,
            metaDescription: result.metaDescription,
         };
      } catch (error) {
         if (error instanceof NotFoundException || error instanceof BadRequestException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
