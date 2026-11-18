import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { RoleService } from '../role.service';
import { permissionInput, toPermissionList } from './permission-input';

const inputSchema = permissionInput.extend({
   roleId: z.number().int().positive().describe('Numeric id of the role.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'revokeRolePermission',
   description:
      'Revoke one `{resource, action}` permission from a role and keep all the others. Revoking a ' +
      'permission the role does not have changes nothing (`revoked: false`). The admin role is ' +
      "locked, and so are the caller's own role and roles with permissions the caller does not " +
      'have; only permissions the caller holds can be granted. Use `listRoles` to find the role id and its current `permissions`. The user ' +
      'confirms the call in an approval tile.',
   inputSchema,
   permission: { resource: PermissionResource.roles, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   audit: {
      action: 'role.revokePermission',
      resourceType: 'role',
      resourceIdFrom: ({ roleId }) => roleId,
   },
})
@Injectable()
export class RevokeRolePermissionTool extends AiToolHandler<Input> {
   constructor(private readonly roleService: RoleService) {
      super();
   }

   async execute(ctx: ToolContext, { roleId, resource, action }: Input) {
      const { changed, role } = await this.roleService.revokePermission(
         roleId,
         {
            resource,
            action,
         },
         ctx.user.id,
      );
      return {
         id: role.id,
         name: role.name,
         revoked: changed,
         permissions: toPermissionList(role.permissions),
      };
   }
}
