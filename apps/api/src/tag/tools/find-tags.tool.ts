import { Injectable } from '@nestjs/common';

import { adminEntityPath } from '@/ai/admin-routes';
import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import {
   LOOKUP_CANDIDATE_LIMIT,
   type LookupInput,
   lookupInputSchema,
   runLookup,
} from '@/ai/tools/lookup';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { TagService } from '../tag.service';
import { tagName, toToolNames } from '../tag-translations';

const inputSchema = lookupInputSchema(
   'Name (Czech or English) or slug of the tag as the user said it ("react", "case study"), without words like "štítek".',
);

@AiTool({
   name: 'findTags',
   description:
      'Find tags by name (in Czech or English) or slug, ignoring case and diacritics and tolerating typos. Returns the ' +
      'best matches first, each with id, `name` (Czech), `names` (`cs` and `en`, null without an English name), slug, how it matched ' +
      '(`exact` | `partial` | `fuzzy`) and `adminUrl`. Use it whenever the user names a tag, ' +
      'before opening (`openEntity`) or changing it. For overviews and sorting use `listTags`.',
   inputSchema,
   permission: { resource: PermissionResource.tags, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class FindTagsTool extends AiToolHandler<LookupInput> {
   constructor(private readonly tagService: TagService) {
      super();
   }

   async execute(_ctx: ToolContext, input: LookupInput) {
      const candidates = await this.tagService.findLookupCandidates(LOOKUP_CANDIDATE_LIMIT + 1);
      return runLookup(
         input,
         candidates,
         (t) => [
            ...t.translations.map((translation) => ({
               label: `name (${translation.language})`,
               value: translation.name,
            })),
            { label: 'slug', value: t.slug },
         ],
         (t) => ({
            id: t.id,
            name: tagName(t),
            names: toToolNames(t),
            slug: t.slug,
            adminUrl: adminEntityPath('tag', t.id),
         }),
      );
   }
}
