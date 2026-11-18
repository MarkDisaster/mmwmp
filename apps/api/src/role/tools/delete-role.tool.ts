import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { RoleService } from '../role.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the role to delete.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteRole',
   description:
      'Delete a role. **Destructive — irreversible.** System roles cannot be deleted; a role with ' +
      'users assigned cannot be deleted either (reassign or delete those users first). The SDK ' +
      'pauses execution and renders a Smazat/Zrušit approval tile to the user — just call the tool ' +
      'with the target id; do not chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.roles, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'role.delete', resourceType: 'role' },
})
@Injectable()
export class DeleteRoleTool extends AiToolHandler<Input> {
   constructor(private readonly roleService: RoleService) {
      super();
   }

   async execute(ctx: ToolContext, { id }: Input) {
      await this.roleService.remove(id, ctx.user.id);
      return { id, deleted: true };
   }
}
