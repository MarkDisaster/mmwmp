import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { adminEntityPath } from '@/ai/admin-routes';
import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { RoleService } from '../role.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the role.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'getRole',
   description:
      'Get one RBAC role by id with its full permission set: every granted `resource.action` ' +
      'pair, grouped by resource. An admin role (`isAdmin`) has every permission regardless of ' +
      'the list. Use it before changing the permissions of a role, so the change starts from the ' +
      'current set, and to answer "what can role X do". Find the id with `findRoles`.',
   inputSchema,
   permission: { resource: PermissionResource.roles, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class GetRoleTool extends AiToolHandler<Input> {
   constructor(private readonly roleService: RoleService) {
      super();
   }

   async execute(_ctx: ToolContext, { id }: Input) {
      let role: Awaited<ReturnType<RoleService['findOne']>>;
      try {
         role = await this.roleService.findOne(id);
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Role with id ${id} not found. Find the id with findRoles.`);
         }
         throw error;
      }

      const permissions: Record<string, string[]> = {};
      for (const { resource, action } of role.permissions) {
         (permissions[resource] ??= []).push(action);
      }

      return {
         id: role.id,
         name: role.name,
         isSystem: role.isSystem,
         isAdmin: role.isAdmin,
         permissions,
         permissionCount: role.permissions.length,
         updatedAt: role.updatedAt,
         createdAt: role.createdAt,
         adminUrl: adminEntityPath('role', role.id),
      };
   }
}
