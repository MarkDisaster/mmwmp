import type { PermissionDto } from '@/api/generated';
import { useAuth } from '@/hooks/useAuth';
import { roleHasPermission } from '@/utils/permission';

export const usePermission = (
   resource: PermissionDto['resource'],
   action: PermissionDto['action'],
) => {
   const { user } = useAuth();
   return !!user && roleHasPermission(user.role, { resource, action });
};
