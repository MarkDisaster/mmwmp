import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { FileService } from '../file.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the file to delete.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteFile',
   description:
      'Move a file to the trash (Koš). It disappears from the library, the pickers and the website; ' +
      'the stored objects are kept, a project that uses it keeps the reference, and `restoreFile` ' +
      'brings it back. Deleted for good after 30 days. A file that a published project shows needs ' +
      'the publish permission. Needs approval: the SDK pauses execution and renders a Smazat/Zrušit ' +
      'approval tile to the user — just call the tool with the target id; do not chat-ask for ' +
      'confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.files, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'file.trash', resourceType: 'file' },
})
@Injectable()
export class DeleteFileTool extends AiToolHandler<Input> {
   constructor(private readonly fileService: FileService) {
      super();
   }

   async execute(ctx: ToolContext, { id }: Input) {
      try {
         await this.fileService.trash(
            id,
            ctx.user.id,
            toSaveActor(ctx.user, PermissionResource.projects).canPublish,
         );
         return { id, trashed: true, restorable: true };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`File with id ${id} not found.`);
         }
         throw error;
      }
   }
}
