import { Injectable } from '@nestjs/common';

import { adminListPath } from '@/ai/admin-routes';
import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import {
   LOOKUP_CANDIDATE_LIMIT,
   type LookupInput,
   lookupInputSchema,
   runLookup,
} from '@/ai/tools/lookup';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { UserService } from '../user.service';

const inputSchema = lookupInputSchema(
   'Name or e-mail of the user as said ("Jan Novák", "novak"), without words like "uživatel".',
);

@AiTool({
   name: 'findUsers',
   description:
      'Find admin users by first name, last name or e-mail, ignoring case and diacritics and ' +
      'tolerating typos. Deleted users are left out. Returns the best matches first, each with id, ' +
      'name, email, role, how it matched (`exact` | `partial` | `fuzzy`) and `adminUrl` (the user ' +
      'list filtered to that user — users have no detail page). Use it whenever the user names a ' +
      'person, before changing, inviting again or deleting them. For overviews use `listUsers`.',
   inputSchema,
   permission: { resource: PermissionResource.users, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class FindUsersTool extends AiToolHandler<LookupInput> {
   constructor(private readonly userService: UserService) {
      super();
   }

   async execute(_ctx: ToolContext, input: LookupInput) {
      const candidates = await this.userService.findLookupCandidates(LOOKUP_CANDIDATE_LIMIT + 1);
      return runLookup(
         input,
         candidates,
         (u) => [
            { label: 'name', value: `${u.firstName} ${u.lastName}` },
            { label: 'name', value: `${u.lastName} ${u.firstName}` },
            { label: 'email', value: u.email },
         ],
         (u) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`.trim(),
            email: u.email,
            role: u.role.name,
            deactivated: u.deactivatedAt !== null,
            adminUrl: adminListPath('/users', u.email),
         }),
      );
   }
}
