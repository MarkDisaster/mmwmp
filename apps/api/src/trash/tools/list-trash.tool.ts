import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { FileService } from '@/file/file.service';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import { ProjectService } from '@/project/project.service';
import { ServiceService } from '@/service/service.service';
import { TagService } from '@/tag/tag.service';

import { assertTrashPermission, trashTypeSchema } from './trash-types';

const inputSchema = z.object({
   type: trashTypeSchema,
   search: z
      .string()
      .optional()
      .describe('Case-insensitive substring of the title / name / original slug.'),
   limit: z
      .number()
      .int()
      .min(1)
      .max(TOOL_LIST_MAX_LIMIT)
      .optional()
      .describe(`Max items (default ${TOOL_LIST_DEFAULT_LIMIT}, max ${TOOL_LIST_MAX_LIMIT}).`),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'listTrash',
   description:
      'List what is in the trash (Koš) for one type (project, service, tag or file), most recently ' +
      'deleted first: id, title, original slug, when it was deleted and how many days are left ' +
      'before it is purged for good. Use it to find the id for `restoreProject`, `restoreService`, ' +
      '`restoreTag`, `restoreFile` or `purgeTrash`. The caller needs the delete permission of the ' +
      'chosen type.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class ListTrashTool extends AiToolHandler<Input> {
   constructor(
      private readonly projects: ProjectService,
      private readonly services: ServiceService,
      private readonly tags: TagService,
      private readonly files: FileService,
   ) {
      super();
   }

   async execute(ctx: ToolContext, { type, search, limit }: Input) {
      assertTrashPermission(ctx, type);
      const query = {
         page: 0,
         limit: Math.min(limit ?? TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT),
         search,
      };
      const result = await {
         project: () => this.projects.findTrashed(query),
         service: () => this.services.findTrashed(query),
         tag: () => this.tags.findTrashed(query),
         file: () => this.files.findTrashed(query),
      }[type]();
      return {
         type,
         total: result.totalCount,
         items: result.data.map((row) => ({
            id: row.id,
            title: row.title,
            originalSlug: row.originalSlug,
            deletedAt: row.deletedAt,
            daysLeft: row.daysLeft,
         })),
      };
   }
}
