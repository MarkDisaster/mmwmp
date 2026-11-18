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

import { ServiceService } from '../service.service';

const inputSchema = lookupInputSchema(
   'Name of the service as the user said it — its Czech or English title or slug. ' +
      'Just the name, without words like "služba".',
);

@AiTool({
   name: 'findServices',
   description:
      'Find services by name: matches the Czech and English titles and the slug, ignoring case ' +
      'and diacritics and tolerating typos. Returns the best matches first, each with id, title, ' +
      'slug, status, how it matched (`exact` | `partial` | `fuzzy`) and `adminUrl`. Use it whenever ' +
      'the user names a service, before opening (`openEntity`), reading (`getService`) or changing ' +
      'it. One `exact` match, or a single match: act on it. Several: let the user choose. For ' +
      'overviews and sorting use `listServices`.',
   inputSchema,
   permission: { resource: PermissionResource.services, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class FindServicesTool extends AiToolHandler<LookupInput> {
   constructor(private readonly serviceService: ServiceService) {
      super();
   }

   async execute(_ctx: ToolContext, input: LookupInput) {
      const candidates = await this.serviceService.findLookupCandidates(LOOKUP_CANDIDATE_LIMIT + 1);
      return runLookup(
         input,
         candidates,
         (s) => [
            { label: 'title', value: s.title },
            ...s.translations.map((t) => ({ label: `title (${t.language})`, value: t.title })),
            { label: 'slug', value: s.slug },
         ],
         (s) => ({
            id: s.id,
            title: s.title,
            slug: s.slug,
            status: s.status,
            adminUrl: adminEntityPath('service', s.id),
         }),
      );
   }
}
