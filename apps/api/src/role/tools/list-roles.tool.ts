import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { RoleService } from '../role.service';
import { toPermissionList } from './permission-input';

const inputSchema = z.object({
   search: z.string().optional().describe('Search by role name.'),
   limit: z.number().int().min(1).max(TOOL_LIST_MAX_LIMIT).optional(),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'listRoles',
   description:
      'List configured RBAC roles with their permissions (`{resource, action}` pairs; an admin ' +
      'role has every permission regardless of the list). Use when the user asks about roles, ' +
      'access control or who can do what, and before changing permissions.',
   inputSchema,
   permission: { resource: PermissionResource.roles, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class ListRolesTool extends AiToolHandler<Input> {
   constructor(private readonly roleService: RoleService) {
      super();
   }

   async execute(_ctx: ToolContext, { search, limit }: Input) {
      const result = await this.roleService.findAll({
         page: 0,
         limit: Math.min(limit ?? TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT),
         search,
         sortOrder: 'asc',
         sortBy: 'name',
      });
      return {
         total: result.totalCount,
         items: result.data.map((r) => ({
            id: r.id,
            name: r.name,
            isSystem: r.isSystem,
            isAdmin: r.isAdmin,
            permissions: toPermissionList(r.permissions),
            updatedAt: r.updatedAt,
            createdAt: r.createdAt,
         })),
      };
   }
}
