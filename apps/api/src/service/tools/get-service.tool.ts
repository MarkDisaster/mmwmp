import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { adminEntityPath } from '@/ai/admin-routes';
import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ServiceService } from '../service.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the service.'),
   includeContent: z
      .boolean()
      .optional()
      .describe(
         'Include the rich-text `content` of each translation (long). Default false: only its ' +
            'length is returned. Set true only when the content itself is needed.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'getService',
   description:
      'Get the full detail of one service by id, as the admin editor shows it: fields, the CS/EN ' +
      'translations and the assigned projects in display order (with project ids), plus ' +
      '`adminUrl`. Use it before changing the assigned projects or translations, so the change ' +
      'starts from the current state, and to answer questions about one service. Find the id ' +
      'with `findServices`.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class GetServiceTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(_ctx: ToolContext, { id, includeContent = false }: Input) {
      let service: Awaited<ReturnType<ServiceService['findOne']>>;
      try {
         service = await this.serviceService.findOne(id);
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Service with id ${id} not found. Find the id with findServices.`);
         }
         throw error;
      }

      return {
         id: service.id,
         title: service.title,
         slug: service.slug,
         status: service.status,
         showOnHomepage: service.showOnHomepage,
         sortOrder: service.sortOrder,
         publishedAt: service.publishedAt,
         updatedAt: service.updatedAt,
         createdAt: service.createdAt,
         adminUrl: adminEntityPath('service', service.id),
         translations: service.translations.map((t) => ({
            language: t.language,
            title: t.title,
            description: t.description,
            metaTitle: t.metaTitle,
            metaDescription: t.metaDescription,
            ...(includeContent
               ? { content: t.content }
               : { contentLength: t.content?.length ?? 0 }),
         })),
         projects: service.projects.map(({ project }) => ({
            id: project.id,
            slug: project.slug,
            titles: Object.fromEntries(project.translations.map((t) => [t.language, t.title])),
            adminUrl: adminEntityPath('project', project.id),
         })),
      };
   }
}
