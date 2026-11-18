import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { sourceLanguageNames } from '@/ai/translation';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   projectId: z.number().int().positive().describe('Numeric id of the project.'),
   targetLanguage: z
      .enum([Language.cs, Language.en])
      .describe('Language to translate INTO; the other language of the project is the source.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'generateProjectTranslation',
   description:
      'Machine-translate a project from its other language into `targetLanguage` (CS <-> EN) ' +
      'and return the proposed fields: title, description, content, metaTitle, metaDescription. ' +
      'It does NOT save anything: show the result and save it with `upsertProjectTranslation` ' +
      'only when the user agrees. Every call runs a paid AI model, so call it only on the ' +
      "user's explicit request, once per project and language, never in a loop or for " +
      'several projects at once unless the user asked for exactly those. The source language ' +
      'must already have a translation with a title. The user confirms each call in an approval tile.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: {
      action: 'project.generateTranslation',
      resourceType: 'project',
      resourceIdFrom: ({ projectId }) => projectId,
   },
})
@Injectable()
export class GenerateProjectTranslationTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, targetLanguage }: Input) {
      try {
         const project = await this.projectService.findOne(projectId);
         const source = project.translations.find(
            (translation) => translation.language !== targetLanguage && translation.title.trim(),
         );
         if (!source) {
            throw new Error(
               `Project ${projectId} has no ${sourceLanguageNames(targetLanguage)} ` +
                  'version with a title to translate from.',
            );
         }
         const generated = await this.projectService.generateTranslation(
            projectId,
            targetLanguage,
            {
               title: source.title,
               description: source.description,
               content: source.content,
               metaTitle: source.metaTitle,
               metaDescription: source.metaDescription,
            },
            ctx.user.id,
         );
         return { projectId, language: targetLanguage, saved: false, ...generated };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Project with id ${projectId} not found.`);
         }
         throw error;
      }
   }
}
