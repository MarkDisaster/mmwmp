import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import { PreviewService } from '@/preview/preview.service';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the project.'),
   locale: z
      .enum([Language.cs, Language.en])
      .optional()
      .describe('Language of the preview. Defaults to `cs`.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'getProjectPreviewUrl',
   description:
      'A link that opens the draft of a project on the public web in the given language ' +
      '(`previewUrl`). The signed link expires after 5 minutes: ask for a new one for each ' +
      'preview and give it to the user as a link right away. Find the id with `findProjects`.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class GetProjectPreviewUrlTool extends AiToolHandler<Input> {
   constructor(
      private readonly projectService: ProjectService,
      private readonly previewService: PreviewService,
   ) {
      super();
   }

   async execute(_ctx: ToolContext, { id, locale }: Input) {
      try {
         const project = await this.projectService.findOne(id);
         return {
            previewUrl: this.previewService.getPreviewUrl('projects', project, locale ?? 'cs'),
            expiresInMinutes: 5,
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Project with id ${id} not found.`);
         }
         throw error;
      }
   }
}
