import { z } from 'zod';

import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

const RESOURCES = Object.values(PermissionResource).join(', ');
const ACTIONS = Object.values(PermissionAction).join(', ');

export const permissionInput = z.object({
   resource: z
      .enum(PermissionResource)
      .describe(`Resource the permission applies to: ${RESOURCES}.`),
   action: z.enum(PermissionAction).describe(`Action allowed on the resource: ${ACTIONS}.`),
});

type RolePermission = { resource: PermissionResource; action: PermissionAction };

export const toPermissionList = (permissions: readonly RolePermission[]) =>
   permissions
      .map(({ resource, action }) => ({ resource, action }))
      .sort((a, b) => a.resource.localeCompare(b.resource) || a.action.localeCompare(b.action));
