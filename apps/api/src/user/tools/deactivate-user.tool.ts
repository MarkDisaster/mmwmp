import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { UserService } from '../user.service';

const inputSchema = z.object({
   id: z
      .number()
      .int()
      .positive()
      .describe('Numeric id of the user to deactivate. Use `listUsers` to find it.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deactivateUser',
   description:
      'Deactivate a user account: the user can no longer sign in and every session ends at once, but the account, its audit trail and its authored content stay (preferred over `deleteUser`). Reversible with `reactivateUser`. ' +
      'Nobody can change their own account, an admin user, or a user with permissions the caller ' +
      'does not have. The user confirms the call in an approval tile, do not ask for a chat ' +
      'confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.users, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   audit: { action: 'user.deactivate', resourceType: 'user' },
})
@Injectable()
export class DeactivateUserTool extends AiToolHandler<Input> {
   constructor(private readonly userService: UserService) {
      super();
   }

   async execute(ctx: ToolContext, { id }: Input) {
      const user = await this.userService.deactivate(id, ctx.user.id);
      return { id: user.id, email: user.email, deactivatedAt: user.deactivatedAt };
   }
}
