import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ServiceService } from '../service.service';
import { toLinkedProjects } from './linked-projects';

const inputSchema = z.object({
   search: z.string().optional().describe('Optional case-insensitive search.'),
   limit: z.number().int().min(1).max(TOOL_LIST_MAX_LIMIT).optional(),
   sortBy: z
      .enum(['updatedAt', 'sortOrder'])
      .optional()
      .describe(
         '`updatedAt` (default): last changed first. `sortOrder`: display order, first shown first.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'listServices',
   description:
      'List portfolio services (offerings) from the admin database. Returns id, title, slug, status (draft|published), `sortOrder` (display position, lower first), the linked `projects` (`{id, slug, title}`, in display order), the languages that have a translation (`cs`, `en`) and dates. Ordered by last change by default; pass `sortBy: "sortOrder"` for the display order.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class ListServicesTool extends AiToolHandler<Input> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(_ctx: ToolContext, { search, limit, sortBy = 'updatedAt' }: Input) {
      const result = await this.serviceService.findAll({
         page: 0,
         limit: Math.min(limit ?? TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT),
         search,
         sortOrder: sortBy === 'sortOrder' ? 'asc' : 'desc',
         sortBy,
      });
      return {
         total: result.totalCount,
         items: result.data.map((s) => ({
            id: s.id,
            title: s.title,
            slug: s.slug,
            status: s.status,
            sortOrder: s.sortOrder,
            projects: toLinkedProjects(s.projects),
            languages: s.translations.map(({ language }) => language).sort(),
            publishedAt: s.publishedAt,
            updatedAt: s.updatedAt,
            createdAt: s.createdAt,
         })),
      };
   }
}
