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

import { RoleService } from '../role.service';

const inputSchema = lookupInputSchema(
   'Name of the role as the user said it ("editor"), without words like "role".',
);

@AiTool({
   name: 'findRoles',
   description:
      'Find RBAC roles by name, ignoring case and diacritics and tolerating typos. Returns the ' +
      'best matches first, each with id, name, isSystem, isAdmin, how it matched ' +
      '(`exact` | `partial` | `fuzzy`) and `adminUrl`. Use it whenever the user names a role, ' +
      'before opening (`openEntity`), reading (`getRole`) or changing it.',
   inputSchema,
   permission: { resource: PermissionResource.roles, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class FindRolesTool extends AiToolHandler<LookupInput> {
   constructor(private readonly roleService: RoleService) {
      super();
   }

   async execute(_ctx: ToolContext, input: LookupInput) {
      const candidates = await this.roleService.findLookupCandidates(LOOKUP_CANDIDATE_LIMIT + 1);
      return runLookup(
         input,
         candidates,
         (r) => [{ label: 'name', value: r.name }],
         (r) => ({
            id: r.id,
            name: r.name,
            isSystem: r.isSystem,
            isAdmin: r.isAdmin,
            adminUrl: adminEntityPath('role', r.id),
         }),
      );
   }
}
