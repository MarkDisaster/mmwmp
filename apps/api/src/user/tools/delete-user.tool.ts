import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { UserService } from '../user.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the user to soft-delete.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteUser',
   description:
      'Soft-delete a user. **Destructive.** Only for an account without authored content or audit ' +
      'entries (otherwise it is refused, use `deactivateUser`). ' +
      'Admin users, the caller and users with permissions the caller does not have cannot be ' +
      'deleted. The SDK pauses execution and renders a Smazat/Zrušit approval ' +
      'tile to the user — just call the tool with the target id; do not chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.users, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'user.delete', resourceType: 'user' },
})
@Injectable()
export class DeleteUserTool extends AiToolHandler<Input> {
   constructor(private readonly userService: UserService) {
      super();
   }

   async execute(ctx: ToolContext, { id }: Input) {
      await this.userService.softDelete(id, ctx.user.id);
      return { id, deleted: true };
   }
}
