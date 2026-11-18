import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { FileService } from '../file.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the file in the trash.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'restoreFile',
   description:
      'Take a file out of the trash (Koš). The projects that use it show it again, so a file that a published project shows needs the publish permission. ' +
      'Use `listTrash` to find the id. Needs approval: the SDK pauses execution and renders an ' +
      'approval tile to the user — just call the tool with the target id.',
   inputSchema,
   permission: { resource: PermissionResource.files, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'file.restore', resourceType: 'file' },
})
@Injectable()
export class RestoreFileTool extends AiToolHandler<Input> {
   constructor(private readonly fileService: FileService) {
      super();
   }

   async execute(ctx: ToolContext, { id }: Input) {
      try {
         await this.fileService.restore(
            id,
            toSaveActor(ctx.user, PermissionResource.projects).canPublish,
         );
         return { id, restored: true };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`File with id ${id} is not in the trash.`);
         }
         if (error instanceof ConflictException) {
            throw new Error(error.message);
         }
         throw error;
      }
   }
}
