import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import { tagName } from '@/tag/tag-translations';

import { ProjectService } from '../project.service';

const inputSchema = z.object({
   sortBy: z
      .enum(['updatedAt', 'sortOrder'])
      .optional()
      .describe(
         '`updatedAt` (default): last changed first. `sortOrder`: display order, first shown first.',
      ),
   search: z
      .string()
      .optional()
      .describe('Case-insensitive substring of `title` or `slug`. Omit to list everything.'),
   limit: z
      .number()
      .int()
      .min(1)
      .max(TOOL_LIST_MAX_LIMIT)
      .optional()
      .describe(
         `Max items to return (default ${TOOL_LIST_DEFAULT_LIMIT}, max ${TOOL_LIST_MAX_LIMIT}).`,
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'listProjects',
   description:
      'List portfolio projects from the admin database. Returns id, title, slug, status ' +
      '(draft|published), company, start/end year, links (in display order, the first one is the ' +
      'main project link), tags (`{id, name}`, in display order), the languages that have a ' +
      'translation (`cs`, `en`), publish date, **updatedAt** ' +
      '(last modification timestamp) ' +
      'and createdAt. Results sorted by `updatedAt` descending by default — so the first item is ' +
      'the most recently modified project (translation edits, status flips, tag changes, anything ' +
      'that touches the row counts). Use when the user asks about projects, drafts, what was ' +
      'recently changed, or wants an overview. ' +
      'Search is **case-insensitive substring** on `title` + `slug` — no fuzzy / typo tolerance. ' +
      "If a search returns empty, retry with a shorter keyword (e.g. 'nemocnice' instead of " +
      "'Nemocnice JH' or a misspelling 'nemocncie'). The project `title` mirrors the first " +
      'translation, so searching e.g. "Nemocncie" will not match — strip the typo and try a ' +
      'shorter root.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class ListProjectsTool extends AiToolHandler<Input> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(_ctx: ToolContext, { search, limit, sortBy = 'updatedAt' }: Input) {
      const result = await this.projectService.findAll({
         page: 0,
         limit: Math.min(limit ?? TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT),
         search,
         sortOrder: sortBy === 'sortOrder' ? 'asc' : 'desc',
         sortBy,
      });
      return {
         total: result.totalCount,
         items: result.data.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            status: p.status,
            sortOrder: p.sortOrder,
            company: p.company,
            startYear: p.startYear,
            endYear: p.endYear,
            ongoing: p.ongoing,
            links: p.links.map(({ label, url }) => ({ label, url })),
            tags: p.tags.map(({ tag }) => ({ id: tag.id, name: tagName(tag) })),
            languages: p.translations.map(({ language }) => language).sort(),
            publishedAt: p.publishedAt,
            updatedAt: p.updatedAt,
            createdAt: p.createdAt,
         })),
      };
   }
}
