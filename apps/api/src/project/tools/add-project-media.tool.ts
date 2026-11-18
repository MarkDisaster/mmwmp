import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   projectId: z.number().int().positive().describe('Numeric id of the project.'),
   fileId: z.number().int().positive().describe('Numeric id of the file to attach.'),
   language: z
      .enum([Language.cs, Language.en])
      .optional()
      .describe(
         'Optional language association — useful for locale-specific media. Omit for language-agnostic.',
      ),
   sortOrder: z
      .number()
      .int()
      .optional()
      .describe('Display order within the project media list. Omit to append.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'addProjectMedia',
   description:
      'Attach an existing file (image/video) to a project as media. The file must already be ' +
      'uploaded — this tool only links it, it does NOT upload anything. ' +
      'Use `listFiles` to find the fileId and `listProjects` for the projectId. ' +
      'If the user attached a file directly in the chat, take the `fileId` from the ' +
      '`[Přílohy: fileId=…]` note in the message.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.update },
   behavior: 'mutating',
   publishedTarget: { entity: 'project', idField: 'projectId' },
   editTarget: ({ projectId }) => [{ entity: EditLockEntity.projects, id: projectId }],
   audit: {
      action: 'project.addMedia',
      resourceType: 'project',
      resourceIdFrom: ({ projectId }) => projectId,
   },
})
@Injectable()
export class AddProjectMediaTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(ctx: ToolContext, { projectId, fileId, language, sortOrder }: Input) {
      try {
         const media = await this.projectService.addMedia(
            projectId,
            {
               fileId,
               language,
               sortOrder,
            },
            toSaveActor(ctx.user, PermissionResource.projects),
         );
         return {
            mediaId: media.id,
            projectId: media.projectId,
            fileId: media.fileId,
            language: media.language,
            sortOrder: media.sortOrder,
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
