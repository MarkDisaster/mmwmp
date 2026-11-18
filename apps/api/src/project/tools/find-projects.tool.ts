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

import { ProjectService } from '../project.service';

const inputSchema = lookupInputSchema(
   'Name of the project as the user said it — its Czech or English title, slug or company. ' +
      'Just the name ("selltoro"), without words like "projekt".',
);

@AiTool({
   name: 'findProjects',
   description:
      'Find portfolio projects by name: matches the Czech and English titles, the slug and the ' +
      'company, ignoring case and diacritics and tolerating typos ("seltoro" finds "Selltoro"). ' +
      'Returns the best matches first, each with id, title, slug, status, how it matched ' +
      '(`exact` | `partial` | `fuzzy`) and `adminUrl` (the admin path of the project). Use it ' +
      'whenever the user names a project, before opening (`openEntity`), reading (`getProject`) or ' +
      'changing it. One `exact` match, or a single match: act on it. Several: list them and let the ' +
      'user choose. For overviews and sorting use `listProjects`.',
   inputSchema,
   permission: { resource: PermissionResource.projects, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class FindProjectsTool extends AiToolHandler<LookupInput> {
   constructor(private readonly projectService: ProjectService) {
      super();
   }

   async execute(_ctx: ToolContext, input: LookupInput) {
      const candidates = await this.projectService.findLookupCandidates(LOOKUP_CANDIDATE_LIMIT + 1);
      return runLookup(
         input,
         candidates,
         (p) => [
            { label: 'title', value: p.title },
            ...p.translations.map((t) => ({ label: `title (${t.language})`, value: t.title })),
            { label: 'slug', value: p.slug },
            { label: 'company', value: p.company },
         ],
         (p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            status: p.status,
            company: p.company,
            adminUrl: adminEntityPath('project', p.id),
         }),
      );
   }
}
