import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { adminEntityPath } from '@/ai/admin-routes';
import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { fileDisplayName } from '@/file/file-display-name';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import { tagName } from '@/tag/tag-translations';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the project.'),
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
   name: 'getProject',
   description:
      'Get the full detail of one project by id, as the admin editor shows it: fields, the CS/EN ' +
      'translations, the assigned tags in display order (with tag ids), the links, the thumbnail ' +
      'and the gallery media in display order (each with its `mediaId` for `removeProjectMedia` / ' +
      '`sortProjectMedia` and its `fileId`), plus `adminUrl`. Use it before changing tags, media, ' +
      'links or translations, so the change starts from the current state, and to answer ' +
      'questions about one project. Find the id with `findProjects`.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class GetProjectTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(_ctx: ToolContext, { id, includeContent = false }: Input) {
      let project: Awaited<ReturnType<ProjectService['findOne']>>;
      try {
         project = await this.projectService.findOne(id);
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Project with id ${id} not found. Find the id with findProjects.`);
         }
         throw error;
      }

      return {
         id: project.id,
         title: project.title,
         slug: project.slug,
         status: project.status,
         company: project.company,
         startYear: project.startYear,
         endYear: project.endYear,
         ongoing: project.ongoing,
         showOnHomepage: project.showOnHomepage,
         sortOrder: project.sortOrder,
         publishedAt: project.publishedAt,
         updatedAt: project.updatedAt,
         createdAt: project.createdAt,
         adminUrl: adminEntityPath('project', project.id),
         translations: project.translations.map((t) => ({
            language: t.language,
            title: t.title,
            role: t.role,
            description: t.description,
            metaTitle: t.metaTitle,
            metaDescription: t.metaDescription,
            ...(includeContent
               ? { content: t.content }
               : { contentLength: t.content?.length ?? 0 }),
         })),
         tags: project.tags.map(({ tag }) => ({ id: tag.id, name: tagName(tag), slug: tag.slug })),
         links: project.links.map(({ label, url }) => ({ label, url })),
         thumbnail: project.thumbnail
            ? { fileId: project.thumbnail.id, name: fileDisplayName(project.thumbnail) }
            : null,
         media: project.media.map((m) => ({
            mediaId: m.id,
            fileId: m.fileId,
            name: m.file ? fileDisplayName(m.file) : null,
            mimeType: m.file?.mimeType ?? null,
            language: m.language,
         })),
         createdBy: project.createdBy
            ? {
                 id: project.createdBy.id,
                 name: `${project.createdBy.firstName} ${project.createdBy.lastName}`.trim(),
              }
            : null,
      };
   }
}
