import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { UserInvitationService } from '../user-invitation.service';

const inputSchema = z.object({
   userId: z
      .number()
      .int()
      .positive()
      .describe('Numeric id of the pending (not-yet-accepted) user. Use `listUsers` to find them.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'resendUserInvitation',
   description:
      'Resend the invitation email to a user who was invited but has not yet accepted. Generates a ' +
      'fresh 7-day token and emails it. Fails if the user has already accepted (use the admin UI ' +
      'for a password reset in that case). Sends a real email: the user confirms the call in an ' +
      'approval tile, do not ask for a chat confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.users, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   audit: { action: 'user.resendInvitation', resourceType: 'user' },
})
@Injectable()
export class ResendUserInvitationTool extends AiToolHandler<Input> {
   constructor(private readonly invitations: UserInvitationService) {
      super();
   }

   async execute(ctx: ToolContext, { userId }: Input) {
      const result = await this.invitations.resend(userId, ctx.user.id);
      return { id: result.id, email: result.email, resent: true };
   }
}
