import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { RICH_TEXT_HTML_HINT } from '@/common/sanitize/sanitize-rich-text';
import { toSaveActor } from '@/common/save/save-actor';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { UpsertTranslationDto } from '../dto/upsert-translation.dto';
import { MAX_ROLE_LENGTH } from '../project.constants';
import { ProjectService } from '../project.service';

const inputSchema = z.object({
   projectId: z.number().int().positive().describe('Numeric id of the project.'),
   language: z.enum([Language.cs, Language.en]).describe('Target language of the translation.'),
   title: z
      .string()
      .min(1)
      .optional()
      .describe(
         'Project title in this language. Required when creating a new translation; omit to keep current on existing rows.',
      ),
   role: z
      .string()
      .max(MAX_ROLE_LENGTH)
      .nullable()
      .optional()
      .describe(
         'Role on the project in this language, e.g. "Frontend developer". Omit to keep, `null` to clear.',
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
   name: 'upsertProjectTranslation',
   description:
      'Create or update a project translation in one language (CS or EN). Translation fields: ' +
      'title, role, description, content (rich HTML), metaTitle, metaDescription. ' +
      'Pass only the fields you want to change — omitted fields stay as they are; `null` clears a ' +
      'field. When creating a brand new translation row, `title` is required. ' +
      'Use `listProjects` to find the project id and ask the user which language unless explicit.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: {
      action: 'project.upsertTranslation',
      resourceType: 'project',
      resourceIdFrom: ({ projectId }) => projectId,
   },
})
@Injectable()
export class UpsertProjectTranslationTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(
      ctx: ToolContext,
      { projectId, language, title, role, description, content, metaTitle, metaDescription }: Input,
   ) {
      const partial: Partial<UpsertTranslationDto> = {};
      if (title !== undefined) partial.title = title;
      if (role !== undefined) partial.role = role ?? '';
      if (description !== undefined) partial.description = description ?? '';
      if (content !== undefined) partial.content = content ?? '';
      if (metaTitle !== undefined) partial.metaTitle = metaTitle ?? '';
      if (metaDescription !== undefined) partial.metaDescription = metaDescription ?? '';

      try {
         const result = await this.projectService.upsertTranslation(
            projectId,
            language,
            partial,
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return {
            projectId: result.projectId,
            language: result.language,
            title: result.title,
            role: result.role,
            description: result.description,
            metaTitle: result.metaTitle,
         };
      } catch (error) {
         if (error instanceof NotFoundException || error instanceof BadRequestException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
