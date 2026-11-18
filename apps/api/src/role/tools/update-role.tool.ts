import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { RoleService } from '../role.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the role to rename.'),
   name: z.string().min(2).describe('New name (min 2 chars). Must be unique among roles.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateRole',
   description:
      'Rename an existing role. System roles (e.g. ADMIN) cannot be renamed — the BE rejects the call. ' +
      'Use `listRoles` first to find the id from a name.',
   inputSchema,
   permission: { resource: PermissionResource.roles, action: PermissionAction.update },
   behavior: 'mutating',
   audit: { action: 'role.update', resourceType: 'role' },
})
@Injectable()
export class UpdateRoleTool extends AiToolHandler<Input> {
   constructor(private readonly roleService: RoleService) {
      super();
   }

   async execute(ctx: ToolContext, { id, name }: Input) {
      const role = await this.roleService.update(id, { name }, ctx.user.id);
      return { id: role.id, name: role.name };
   }
}
