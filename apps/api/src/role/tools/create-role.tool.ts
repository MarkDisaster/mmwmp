import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { RoleService } from '../role.service';

const inputSchema = z.object({
   name: z
      .string()
      .min(2)
      .describe(
         'Role name (min 2 chars). Convention: lowercase with hyphens, e.g. "content-editor".',
      ),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'createRole',
   description:
      'Create a new role. Roles group permissions and are assigned to users. ' +
      'Name must be at least 2 characters and unique. After creating, use `setRolePermissions` ' +
      'to grant access; freshly created roles have no permissions and cannot be assigned ' +
      'usefully until permissions are set.',
   inputSchema,
   permission: { resource: PermissionResource.roles, action: PermissionAction.create },
   behavior: 'mutating',
   audit: { action: 'role.create', resourceType: 'role' },
})
@Injectable()
export class CreateRoleTool extends AiToolHandler<Input> {
   constructor(private readonly roleService: RoleService) {
      super();
   }

   async execute(ctx: ToolContext, { name }: Input) {
      const role = await this.roleService.create({ name }, ctx.user.id);
      return { id: role.id, name: role.name };
   }
}
