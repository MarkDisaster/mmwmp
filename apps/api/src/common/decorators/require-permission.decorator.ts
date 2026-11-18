import { SetMetadata } from '@nestjs/common';

import type { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

export const PERMISSION_KEY = 'permission';

export type RequiredPermission = { resource: PermissionResource; action: PermissionAction };

export const RequirePermission = (resource: PermissionResource, action: PermissionAction) =>
   SetMetadata(PERMISSION_KEY, { resource, action });
