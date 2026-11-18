import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { UserInvitationService } from '../user-invitation.service';

const inputSchema = z.object({
   email: z.string().email().describe('Email address of the new user. Must not already exist.'),
   roleId: z
      .number()
      .int()
      .positive()
      .describe('Numeric id of the role to assign. Non-admin roles only.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'inviteUser',
   description:
      'Invite a new user by email with a specific role. Sends an invitation email with a 7-day ' +
      'token; the recipient sets their own name and password through the invitation flow. ' +
      'Use `listRoles` first to find the roleId. Cannot invite into an admin role (BE blocks it), ' +
      'nor into a role with permissions the caller does not have. ' +
      'Sends a real email: the user confirms the call in an approval tile, do not ask for a chat ' +
      'confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.users, action: PermissionAction.create },
   behavior: 'mutating',
   needsApproval: true,
   audit: { action: 'user.invite', resourceType: 'user' },
})
@Injectable()
export class InviteUserTool extends AiToolHandler<Input> {
   constructor(private readonly invitations: UserInvitationService) {
      super();
   }

   async execute(ctx: ToolContext, { email, roleId }: Input) {
      const result = await this.invitations.invite(email, roleId, ctx.user.id);
      return { id: result.id, email: result.email, invited: true };
   }
}
