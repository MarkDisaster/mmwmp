import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { MIME_TYPE_PREFIX_PATTERN } from '../dto/file-query.dto';
import { FileService } from '../file.service';

const inputSchema = z.object({
   search: z
      .string()
      .optional()
      .describe(
         'Case-insensitive substring of `originalName` or `displayName` (either one matches). Omit to list everything.',
      ),
   mimeTypePrefix: z
      .string()
      .regex(
         MIME_TYPE_PREFIX_PATTERN,
         'A lowercase MIME type prefix with the slash, e.g. `image/` or `application/pdf`.',
      )
      .optional()
      .describe(
         'Filter by mime-type prefix — e.g. `image/`, `image/png`, `application/pdf`, `video/`.',
      ),
   sortBy: z
      .enum(['createdAt', 'originalName', 'size'])
      .optional()
      .describe('Sort field. Defaults to `createdAt` (newest first).'),
   sortOrder: z
      .enum(['asc', 'desc'])
      .optional()
      .describe('Sort direction. Default depends on `sortBy` — `desc` for createdAt/size.'),
   page: z.number().int().min(0).optional().describe('Page number, 0-indexed. Defaults to 0.'),
   limit: z.number().int().min(1).max(TOOL_LIST_MAX_LIMIT).optional(),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'listFiles',
   description:
      'List uploaded files (R2 storage) with their metadata. Use when user asks about uploaded ' +
      'media, attachments or file inventory, and before renaming files (`updateFile` / ' +
      '`updateFiles`). Each item has `originalName` (uploaded name), `displayName` (the admin ' +
      'label, null when unset) and `filename` (storage name); the name shown in the admin is ' +
      '`displayName || originalName`. `total` is the number of matches: page through them ' +
      '(`page`) when it exceeds `limit`. ' +
      'Search is **case-insensitive substring** on `originalName` + `displayName` — no fuzzy / ' +
      'token / separator tolerance. If a search returns empty, retry with a shorter or alternate ' +
      "keyword (e.g. user types 'ai testovaci soubor' but the real filename has hyphens — try " +
      "'testovaci' alone, or swap spaces ↔ hyphens). " +
      'Optional `mimeTypePrefix` filters by mime prefix — e.g. `image/` for all images, ' +
      '`image/png` for PNGs only, `application/pdf` for PDFs. Optional `sortBy` switches the ' +
      'order between `createdAt` (newest first by default), `originalName` (A→Z), or `size` ' +
      '(largest first).',
   inputSchema,
   permission: { resource: PermissionResource.files, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class ListFilesTool extends AiToolHandler<Input> {
   constructor(private readonly fileService: FileService) {
      super();
   }

   async execute(
      _ctx: ToolContext,
      { search, mimeTypePrefix, sortBy, sortOrder, page, limit }: Input,
   ) {
      const sortField = sortBy ?? 'createdAt';
      const defaultOrder: 'asc' | 'desc' = sortField === 'originalName' ? 'asc' : 'desc';
      const result = await this.fileService.findAll({
         page: page ?? 0,
         limit: Math.min(limit ?? TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT),
         search,
         mimeTypePrefix,
         sortOrder: sortOrder ?? defaultOrder,
         sortBy: sortField,
      });
      return {
         total: result.totalCount,
         items: result.data.map((f) => ({
            id: f.id,
            filename: f.filename,
            originalName: f.originalName,
            displayName: f.displayName,
            altText: f.altText,
            mimeType: f.mimeType ?? null,
            language: f.language ?? null,
            sizeBytes: f.size ?? null,
            createdAt: f.createdAt,
         })),
      };
   }
}
