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

import type { SaveProjectDto } from '../dto/save-project.dto';
import {
   MAX_COMPANY_LENGTH,
   MAX_PROJECT_YEAR,
   MAX_ROLE_LENGTH,
   MIN_PROJECT_YEAR,
} from '../project.constants';
import { ProjectService } from '../project.service';

const translationSchema = z.object({
   title: z.string().trim().min(1).describe('Project title in this language.'),
   role: z
      .string()
      .max(MAX_ROLE_LENGTH)
      .optional()
      .describe('Role on the project, e.g. "Frontend developer".'),
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
      .describe('URL-friendly slug, unique among projects, e.g. `nemocnice-jh`.'),
   cs: translationSchema.describe('The Czech version. Required.'),
   en: translationSchema.optional().describe('The English version. Omit when not wanted.'),
   company: z.string().max(MAX_COMPANY_LENGTH).optional().describe('Client or company.'),
   startYear: z.number().int().min(MIN_PROJECT_YEAR).max(MAX_PROJECT_YEAR).optional(),
   endYear: z
      .number()
      .int()
      .min(MIN_PROJECT_YEAR)
      .max(MAX_PROJECT_YEAR)
      .optional()
      .describe(
         'Year the work ended. Omit for a project that has only a start year or is ongoing.',
      ),
   ongoing: z
      .boolean()
      .optional()
      .describe(
         'The project is still running (shown as "start year to today"). Needs `startYear`, ' +
            'forbids `endYear`. Defaults to false.',
      ),
   showOnHomepage: z.boolean().optional().describe('Show on the homepage. Defaults to false.'),
   status: z
      .enum([EntityStatus.draft, EntityStatus.published])
      .optional()
      .describe('Defaults to `draft`. `published` needs the publish permission and goes live.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'createProject',
   description:
      'Create a new project in one step: slug plus the Czech version (title, optional role, ' +
      'description, content) and optionally the English one, company, years, homepage flag. ' +
      'Created as a `draft` unless `status` is `published` (needs the publish permission; the ' +
      'user confirms it in an approval tile). Not idempotent: a repeated call fails because the ' +
      'slug is taken, so check with `findProjects` first and never call it twice. Tags, links, ' +
      'media and a thumbnail are added afterwards with their own tools. Returns `id` and ' +
      '`adminUrl`; open it with `openEntity`.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.create },
   behavior: 'mutating',
   needsApproval: ({ status }) => status === EntityStatus.published,
   audit: { action: 'project.saveNew', resourceType: 'project' },
})
@Injectable()
export class CreateProjectTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(
      ctx: ToolContext,
      { slug, cs, en, company, startYear, endYear, ongoing, showOnHomepage, status }: Input,
   ) {
      const dto: SaveProjectDto = {
         slug,
         thumbnailId: null,
         showOnHomepage: showOnHomepage ?? false,
         company: company ?? null,
         startYear: startYear ?? null,
         endYear: endYear ?? null,
         ongoing: ongoing ?? false,
         translations: [
            { language: Language.cs, ...cs },
            ...(en ? [{ language: Language.en, ...en }] : []),
         ],
         tagIds: [],
         links: [],
         media: [],
         status,
      };
      try {
         const project = await this.projectService.saveNew(
            dto,
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return {
            id: project.id,
            slug: project.slug,
            title: project.title,
            status: project.status,
            adminUrl: adminEntityPath('project', project.id),
         };
      } catch (error) {
         if (error instanceof HttpException) throw new Error(error.message);
         throw error;
      }
   }
}
