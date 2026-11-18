import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';

import { UserService } from '../user.service';

const inputSchema = z.object({
   firstName: z.string().trim().min(1).describe('New first name.'),
   lastName: z.string().trim().min(1).describe('New last name.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'updateMyName',
   description:
      'Change the first and last name of the user who is chatting (both are required). Only the ' +
      'own name: other users are changed with `updateUser`. The password and the avatar cannot ' +
      'be changed through the chat: send the user to the profile page (`navigateTo` `/profile`).',
   inputSchema,
   permission: 'authenticated',
   behavior: 'mutating',
   audit: { action: 'user.updateName', resourceType: 'user' },
})
@Injectable()
export class UpdateMyNameTool extends AiToolHandler<Input> {
   constructor(private readonly userService: UserService) {
      super();
   }

   async execute(ctx: ToolContext, { firstName, lastName }: Input) {
      try {
         const user = await this.userService.updateName(ctx.user.id, { firstName, lastName });
         return { id: user.id, firstName: user.firstName, lastName: user.lastName };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error('Your account was not found.');
         }
         throw error;
      }
   }
}
