import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { FileService } from '../file.service';
import { fileDisplayName } from '../file-display-name';

const inputSchema = z.object({
   page: z.number().int().min(0).optional().describe('Page number, 0-indexed. Defaults to 0.'),
   limit: z.number().int().min(1).max(TOOL_LIST_MAX_LIMIT).optional(),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'findUnusedFiles',
   description:
      'Files that no project uses (not a thumbnail, not project media), biggest first, with ' +
      '`total` and `totalSizeBytes` of ALL of them. Use for "uklid nepoužité soubory", "co ' +
      'zabírá místo". "Unused" means "not attached to a project": a file may still be linked ' +
      'by URL inside a rich-text content or by the web code, so tell the user that before ' +
      'deleting. Delete with `deleteFiles` (one confirmation), after the user agrees.',
   inputSchema,
   permission: { resource: PermissionResource.files, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class FindUnusedFilesTool extends AiToolHandler<Input> {
   constructor(private readonly fileService: FileService) {
      super();
   }

   async execute(_ctx: ToolContext, { page, limit }: Input) {
      const result = await this.fileService.findUnused(
         page ?? 0,
         Math.min(limit ?? TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT),
      );
      return {
         total: result.totalCount,
         totalSizeBytes: result.totalSizeBytes,
         items: result.data.map((file) => ({
            id: file.id,
            name: fileDisplayName(file),
            mimeType: file.mimeType,
            sizeBytes: file.size,
            createdAt: file.createdAt,
         })),
      };
   }
}
