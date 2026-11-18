import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';

import { UserService } from '../user.service';

const inputSchema = z.object({});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'getMyProfile',
   description:
      'The profile of the user who is chatting: name, e-mail, role and its permissions ' +
      '(`resource.action` pairs; an admin role can do everything). Use for "kdo jsem", ' +
      '"co smím dělat", "jakou mám roli". Needs no permission: every signed-in user has a profile.',
   inputSchema,
   permission: 'authenticated',
   behavior: 'readonly',
})
@Injectable()
export class GetMyProfileTool extends AiToolHandler<Input> {
   constructor(private readonly userService: UserService) {
      super();
   }

   async execute(ctx: ToolContext, _input: Input) {
      try {
         const user = await this.userService.findOne(ctx.user.id);
         return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
               ? {
                    name: user.role.name,
                    isAdmin: user.role.isAdmin,
                    permissions: user.role.permissions.map(
                       ({ resource, action }) => `${resource}.${action}`,
                    ),
                 }
               : null,
            createdAt: user.createdAt,
         };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error('Your account was not found.');
         }
         throw error;
      }
   }
}
