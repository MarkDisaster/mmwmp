import { HttpException, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { adminEntityPath } from '@/ai/admin-routes';
import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { RICH_TEXT_HTML_HINT } from '@/common/sanitize/sanitize-rich-text';
import { toSaveActor } from '@/common/save/save-actor';
import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import {
   EntityStatus,
   Language,
   PermissionAction,
   PermissionResource,
} from '@/generated/prisma/enums';

import type { SaveServiceDto } from '../dto/save-service.dto';
import { ServiceService } from '../service.service';

const translationSchema = z.object({
   title: z.string().trim().min(1).describe('Service title in this language.'),
   description: z.string().optional().describe('Short description (plain text; tags are removed).'),
   content: z
      .string()
      .optional()
      .describe(`Full content (rich HTML, sanitised server-side). ${RICH_TEXT_HTML_HINT}`),
});

const inputSchema = z.object({
   slug: z
      .string()
      .regex(SLUG_REGEX, `${SLUG_MESSAGE}.`)
      .describe('URL-friendly slug, unique among services.'),
   cs: translationSchema.describe('The Czech version. Required.'),
   en: translationSchema.optional().describe('The English version. Omit when not wanted.'),
   showOnHomepage: z.boolean().optional().describe('Show on the homepage. Defaults to false.'),
   status: z
      .enum([EntityStatus.draft, EntityStatus.published])
      .optional()
      .describe('Defaults to `draft`. `published` needs the publish permission and goes live.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'createService',
   description:
      'Create a new service in one step: slug plus the Czech version (title, optional ' +
      'description, content) and optionally the English one and the homepage flag. Created as ' +
      'a `draft` unless `status` is `published` (needs the publish permission; the user confirms ' +
      'it in an approval tile). Not idempotent: a repeated call fails because the slug is taken, ' +
      'so check with `findServices` first and never call it twice. Assign projects afterwards ' +
      'with `addServiceProject`. Returns `id` and `adminUrl`; open it with `openEntity`.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.create },
   behavior: 'mutating',
   needsApproval: ({ status }) => status === EntityStatus.published,
   audit: { action: 'service.saveNew', resourceType: 'service' },
})
@Injectable()
export class CreateServiceTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(ctx: ToolContext, { slug, cs, en, showOnHomepage, status }: Input) {
      const dto: SaveServiceDto = {
         slug,
         showOnHomepage: showOnHomepage ?? false,
         status,
         translations: [
            { language: Language.cs, ...cs },
            ...(en ? [{ language: Language.en, ...en }] : []),
         ],
         projectIds: [],
      };
      try {
         const service = await this.serviceService.saveNew(
            dto,
            toSaveActor(ctx.user, PermissionResource.services),
         );
         return {
            id: service.id,
            slug: service.slug,
            title: service.title,
            status: service.status,
            adminUrl: adminEntityPath('service', service.id),
         };
      } catch (error) {
         if (error instanceof HttpException) throw new Error(error.message);
         throw error;
      }
   }
}
