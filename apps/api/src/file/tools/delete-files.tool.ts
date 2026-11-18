import { HttpException, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { toSaveActor } from '@/common/save/save-actor';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { FileService } from '../file.service';

const inputSchema = z.object({
   files: z
      .array(
         z.object({
            id: z.number().int().positive().describe('Numeric id of the file.'),
            name: z.string().describe('Its name as the listing returned it (for the tile).'),
            sizeBytes: z.number().int().min(0).describe('Its size, for the total in the tile.'),
         }),
      )
      .min(1)
      .max(TOOL_LIST_MAX_LIMIT)
      .refine((files) => new Set(files.map(({ id }) => id)).size === files.length, {
         message: 'Each file may appear only once.',
      })
      .describe(`1 to ${TOOL_LIST_MAX_LIMIT} files to delete.`),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteFiles',
   description:
      `Move up to ${TOOL_LIST_MAX_LIMIT} files to the trash with ` +
      'ONE confirmation (`deleteFile` for a single one); `restoreFile` brings one back, they are ' +
      'deleted for good after the retention period or by `purgeTrash`. **Destructive.** Each ' +
      'item carries `name` and `sizeBytes` so the approval tile shows the count, names and ' +
      'total size. Names and sizes are checked against the database first: a mismatch moves NOTHING (`applied: false`). A file shown in a published project needs the publish right, otherwise it is refused and listed in `failed`; the ' +
      'others are moved one by one. Take the files from `findUnusedFiles` or `listFiles`. ' +
      'Do not chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.files, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: {
      action: 'file.trashMany',
      resourceType: 'file',
      resourceIdFrom: (_input, output) => {
         const deleted = (output as { deleted?: { id: number }[] }).deleted;
         return deleted?.length ? deleted.map(({ id }) => id).join(',') : null;
      },
   },
})
@Injectable()
export class DeleteFilesTool extends AiToolHandler<Input> {
   private readonly logger = new Logger(DeleteFilesTool.name);

   constructor(private readonly fileService: FileService) {
      super();
   }

   async execute(ctx: ToolContext, { files }: Input) {
      const { canPublish } = toSaveActor(ctx.user, PermissionResource.projects);
      const actual = await this.fileService.findSummaries(files.map(({ id }) => id));
      const problems = files.flatMap((file) => {
         const stored = actual.get(file.id);
         if (!stored) return [{ id: file.id, name: file.name, reason: 'File not found' }];
         if (stored.name !== file.name || stored.size !== file.sizeBytes) {
            return [
               {
                  id: file.id,
                  name: file.name,
                  reason: `The file is "${stored.name}" (${stored.size} bytes), not "${file.name}" (${file.sizeBytes} bytes)`,
               },
            ];
         }
         return [];
      });
      if (problems.length > 0) {
         return { applied: false, deletedCount: 0, freedBytes: 0, deleted: [], failed: problems };
      }

      const deleted: { id: number; name: string }[] = [];
      const failed: { id: number; name: string; reason: string }[] = [];
      let freedBytes = 0;
      for (const file of files) {
         try {
            await this.fileService.trash(file.id, ctx.user.id, canPublish);
            deleted.push({ id: file.id, name: file.name });
            freedBytes += file.sizeBytes;
         } catch (error) {
            if (error instanceof HttpException) {
               failed.push({ id: file.id, name: file.name, reason: error.message });
            } else {
               this.logger.error(`Deleting file ${file.id} failed`, error);
               failed.push({ id: file.id, name: file.name, reason: 'Unexpected error' });
            }
         }
      }
      return {
         applied: failed.length === 0,
         deletedCount: deleted.length,
         freedBytes,
         deleted,
         failed,
      };
   }
}
