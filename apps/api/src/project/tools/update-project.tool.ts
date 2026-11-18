import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { MAX_COMPANY_LENGTH, MAX_PROJECT_YEAR, MIN_PROJECT_YEAR } from '../project.constants';
import { ProjectService } from '../project.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the project to update.'),
   slug: z
      .string()
      .regex(SLUG_REGEX, `${SLUG_MESSAGE}.`)
      .optional()
      .describe(
         'New URL-friendly slug (lowercase, hyphens, e.g. "personal-site"). Must stay unique.',
      ),
   company: z
      .string()
      .max(MAX_COMPANY_LENGTH)
      .nullable()
      .optional()
      .describe('Company or client the project was made for. Omit to keep, `null` to clear.'),
   startYear: z
      .number()
      .int()
      .min(MIN_PROJECT_YEAR)
      .max(MAX_PROJECT_YEAR)
      .nullable()
      .optional()
      .describe('Year the work started. Omit to keep, `null` to clear.'),
   endYear: z
      .number()
      .int()
      .min(MIN_PROJECT_YEAR)
      .max(MAX_PROJECT_YEAR)
      .nullable()
      .optional()
      .describe(
         'Year the work ended; `null` clears it. Needs a start year and must not be before it. ' +
            'Must be `null` while the project is `ongoing`.',
      ),
   ongoing: z
      .boolean()
      .optional()
      .describe(
         'The project is still running (the web shows "start year to today"). `true` needs a ' +
            'start year and `endYear: null` (send both together); giving an end year to a ' +
            'running project needs `ongoing: false` in the same call. Omit to keep.',
      ),
   showOnHomepage: z
      .boolean()
      .optional()
      .describe('Whether the project appears in the homepage section. Omit to keep.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateProject',
   description:
      'Update non-translated metadata of a project: slug, company, the years it ran (the ' +
      '"period" shown on the web) and homepage visibility (`showOnHomepage`). ' +
      'Pass only the fields you want to change; omitted fields stay as they are. To change the ' +
      'display order use `moveProject`, for the links (the first one is the main project link) ' +
      '`setProjectLinks`. ' +
      'Use `listProjects` first if you need to find the id. ' +
      'This tool does NOT change title, description or content — those live in the project ' +
      'translation row. Use `upsertProjectTranslation` for those, picking the language explicitly.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'id' },
   editTarget: ({ id }) => [{ entity: EditLockEntity.projects, id }],
   audit: { action: 'project.update', resourceType: 'project' },
})
@Injectable()
export class UpdateProjectTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(
      ctx: ToolContext,
      { id, slug, company, startYear, endYear, ongoing, showOnHomepage }: Input,
   ) {
      try {
         const project = await this.projectService.update(
            id,
            {
               slug,
               company,
               startYear,
               endYear,
               ongoing,
               showOnHomepage,
            },
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return {
            id: project.id,
            title: project.title,
            slug: project.slug,
            sortOrder: project.sortOrder,
            company: project.company,
            startYear: project.startYear,
            endYear: project.endYear,
            ongoing: project.ongoing,
            showOnHomepage: project.showOnHomepage,
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Project with id ${id} not found.`);
         }
         if (error instanceof BadRequestException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
