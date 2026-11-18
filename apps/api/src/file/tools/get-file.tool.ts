import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { FileService } from '../file.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the file.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'getFile',
   description:
      'Get detailed metadata for a single uploaded file by id — mimeType, dimensions, size, ' +
      'storage path, public URL, who uploaded it, all generated variants (thumbnail / medium / ' +
      'large / original) with their public URLs. Use when the user asks for details of a specific ' +
      'file, before destructive operations (delete/rename), or when you need the public URL to ' +
      'reference the file. Use `listFiles` first to discover the id.',
   inputSchema,
   permission: { resource: PermissionResource.files, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class GetFileTool extends AiToolHandler<Input> {
   constructor(private readonly fileService: FileService) {
      super();
   }

   async execute(_ctx: ToolContext, { id }: Input) {
      try {
         const file = await this.fileService.findOne(id);
         return {
            id: file.id,
            filename: file.filename,
            originalName: file.originalName,
            displayName: file.displayName,
            altText: file.altText,
            mimeType: file.mimeType,
            sizeBytes: file.size,
            width: file.width,
            height: file.height,
            language: file.language,
            storagePath: file.storagePath,
            publicUrl: file.publicUrl,
            createdAt: file.createdAt,
            createdBy: file.createdBy
               ? {
                    id: file.createdBy.id,
                    firstName: file.createdBy.firstName,
                    lastName: file.createdBy.lastName,
                 }
               : null,
            variants: file.variants.map((v) => ({
               variant: v.variant,
               mimeType: v.mimeType,
               sizeBytes: v.size,
               width: v.width,
               height: v.height,
               publicUrl: v.publicUrl,
            })),
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`File with id ${id} not found.`);
         }
         throw error;
      }
   }
}
