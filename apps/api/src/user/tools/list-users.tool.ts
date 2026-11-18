import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import { TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT } from '@/ai/tools/limits';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { UserService } from '../user.service';

const inputSchema = z.object({
   search: z.string().optional().describe('Search by email or name (case-insensitive).'),
   status: z
      .enum(['all', 'active', 'deactivated'])
      .optional()
      .describe('Which accounts to list, default all (deactivated ones included).'),
   limit: z.number().int().min(1).max(TOOL_LIST_MAX_LIMIT).optional(),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'listUsers',
   description:
      'List admin users with their email, name, role and `deactivatedAt` (set = account deactivated, cannot sign in). Use when user asks about team members, accounts or invites.',
   inputSchema,
   permission: { resource: PermissionResource.users, action: PermissionAction.read },
   behavior: 'readonly',
})
@Injectable()
export class ListUsersTool extends AiToolHandler<Input> {
   constructor(private readonly userService: UserService) {
      super();
   }

   async execute(_ctx: ToolContext, { search, status, limit }: Input) {
      const result = await this.userService.findAll({
         page: 0,
         limit: Math.min(limit ?? TOOL_LIST_DEFAULT_LIMIT, TOOL_LIST_MAX_LIMIT),
         search,
         status: status ?? 'all',
         sortOrder: 'asc',
         sortBy: 'email',
      });
      return {
         total: result.totalCount,
         items: result.data.map((u) => ({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role?.name ?? 'unknown',
            acceptedInvitationAt: u.acceptedInvitationAt,
            deactivatedAt: u.deactivatedAt,
            updatedAt: u.updatedAt,
            createdAt: u.createdAt,
         })),
      };
   }
}
