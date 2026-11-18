import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { UserService } from '../user.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Numeric id of the user to update.'),
   firstName: z.string().min(1).optional().describe('New first name.'),
   lastName: z.string().min(1).optional().describe('New last name.'),
   email: z.string().email().optional().describe('New email address. Must be unique.'),
   roleId: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('New role id. Use `listRoles` to look it up by name.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateUser',
   description:
      'Update a user as admin: first name, last name, email or role. ' +
      'Pass only the fields you want to change; omitted fields stay as they are. ' +
      'Passwords of other users cannot be set at all (the user resets their own). ' +
      'Only an administrator can change the email of another user; nobody can change their own ' +
      'account here, an admin user, or a user or role with permissions the caller does not have. ' +
      'Use `listUsers` first to find the user id and `listRoles` to find a roleId. ' +
      'A change of email or role (login and permissions) is confirmed by the user in an approval ' +
      'tile, do not ask for a chat confirmation first; name changes run without one.',
   inputSchema,
   permission: { resource: PermissionResource.users, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: ({ email, roleId }) => email !== undefined || roleId !== undefined,
   audit: { action: 'user.update', resourceType: 'user' },
})
@Injectable()
export class UpdateUserTool extends AiToolHandler<Input> {
   constructor(private readonly userService: UserService) {
      super();
   }

   async execute(ctx: ToolContext, { id, firstName, lastName, email, roleId }: Input) {
      const user = await this.userService.adminUpdateUser(
         id,
         {
            firstName,
            lastName,
            email,
            roleId,
         },
         ctx.user.id,
      );
      return {
         id: user.id,
         email: user.email,
         firstName: user.firstName,
         lastName: user.lastName,
         roleId: user.role.id,
         roleName: user.role.name,
      };
   }
}
