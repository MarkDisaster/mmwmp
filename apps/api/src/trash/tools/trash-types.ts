import { z } from 'zod';

import type { ToolContext } from '@/ai/tools/tool-auth';
import { ToolPermissionError } from '@/ai/tools/tool-auth';
import { hasPermission } from '@/common/guards/auth.guard';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

const TRASH_TYPES = {
   project: PermissionResource.projects,
   service: PermissionResource.services,
   tag: PermissionResource.tags,
   file: PermissionResource.files,
} as const;

export const trashTypeSchema = z
   .enum(['project', 'service', 'tag', 'file'])
   .describe('What the trash row is: a project, a service, a tag or a file.');

export type TrashType = z.infer<typeof trashTypeSchema>;

export const assertTrashPermission = (ctx: ToolContext, type: TrashType) => {
   const resource = TRASH_TYPES[type];
   if (!hasPermission(ctx.user.role, { resource, action: PermissionAction.delete })) {
      throw new ToolPermissionError(resource, PermissionAction.delete);
   }
};
