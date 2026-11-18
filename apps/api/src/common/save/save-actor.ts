import type { RequiredPermission } from '@/common/decorators/require-permission.decorator';
import { hasPermission } from '@/common/guards/auth.guard';
import { PermissionAction } from '@/generated/prisma/enums';

export type SaveActor = { userId: number; canPublish: boolean };

type PermissionActor = { id: number; role: Parameters<typeof hasPermission>[0] };

export const toSaveActor = (
   user: PermissionActor,
   resource: RequiredPermission['resource'],
): SaveActor => ({
   userId: user.id,
   canPublish: hasPermission(user.role, { resource, action: PermissionAction.publish }),
});
