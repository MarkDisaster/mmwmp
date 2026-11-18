import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   projectId: z.number().int().positive().describe('Numeric id of the project.'),
   language: z.enum([Language.cs, Language.en]).describe('Language of the translation to remove.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteProjectTranslation',
   description:
      'Remove one language variant from a project. The project itself stays — only the CS or EN ' +
      'translation row is deleted. The last translation with a title cannot be deleted. ' +
      '**Destructive — irreversible.** The SDK pauses execution and ' +
      'renders a Smazat/Zrušit approval tile to the user — just call the tool with the target ids; ' +
      'do not chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'destructive',
   audit: {
      action: 'project.deleteTranslation',
      resourceType: 'project',
      resourceIdFrom: ({ projectId }) => projectId,
   },
})
@Injectable()
export class DeleteProjectTranslationTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, language }: Input) {
      try {
         await this.projectService.deleteTranslation(
            projectId,
            language,
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return { projectId, language, deleted: true };
      } catch (error) {
         if (error instanceof NotFoundException || error instanceof BadRequestException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
