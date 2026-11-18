import { z } from 'zod';

import { type ToolContext, ToolPermissionError } from '@/ai/tools/tool-auth';
import { hasPermission } from '@/common/guards/auth.guard';
import {
   type PermissionAction,
   PermissionResource,
   SlugRedirectResource,
} from '@/generated/prisma/enums';

export const slugRedirectTypeSchema = z
   .enum(['project', 'service'])
   .describe('Whose former slugs: `project` or `service`.');

export type SlugRedirectType = z.infer<typeof slugRedirectTypeSchema>;

export const SLUG_REDIRECT_RESOURCES = {
   project: SlugRedirectResource.project,
   service: SlugRedirectResource.service,
} as const;

const PERMISSION_RESOURCES = {
   project: PermissionResource.projects,
   service: PermissionResource.services,
} as const;

export const assertSlugRedirectPermission = (
   ctx: ToolContext,
   type: SlugRedirectType,
   action: PermissionAction,
) => {
   const resource = PERMISSION_RESOURCES[type];
   if (!hasPermission(ctx.user.role, { resource, action })) {
      throw new ToolPermissionError(resource, action);
   }
};
