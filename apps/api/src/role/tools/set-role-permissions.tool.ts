import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { RoleService } from '../role.service';
import { permissionInput, toPermissionList } from './permission-input';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the role.'),
   permissions: z
      .array(permissionInput)
      .describe(
         'Full new permission set. Every permission the role has and this array omits is revoked; ' +
            'an empty array revokes all of them.',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'setRolePermissions',
   description:
      'Replace the full set of permissions on a role: permissions not in the array are revoked, ' +
      'missing ones are granted. Read the current set from `listRoles` (`permissions`) first and ' +
      'send it complete. To grant or revoke a single permission use `grantRolePermission` / ' +
      '`revokeRolePermission` instead, they keep the rest. The admin role is locked, ' +
      "so are the caller's own role and roles above it; the set may only contain permissions " +
      'the caller holds. ' +
      'The user confirms the call in an approval tile.',
   inputSchema,
   permission: { resource: PermissionResource.roles, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   audit: { action: 'role.setPermissions', resourceType: 'role' },
})
@Injectable()
export class SetRolePermissionsTool extends AiToolHandler<Input> {
   constructor(private readonly roleService: RoleService) {
      super();
   }

   async execute(ctx: ToolContext, { id, permissions }: Input) {
      const role = await this.roleService.setPermissions(id, { permissions }, ctx.user.id);
      return {
         id: role.id,
         name: role.name,
         permissions: toPermissionList(role.permissions),
      };
   }
}
