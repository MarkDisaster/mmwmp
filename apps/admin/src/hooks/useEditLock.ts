import { useAuth } from '@/hooks/useAuth';
import { getEditLock, type PublishableResource } from '@/utils/permission';

export const useEditLock = (resource: PublishableResource, record?: { status: string }) => {
   const { user } = useAuth();
   return user ? getEditLock(user.role, resource, record) : 'permission';
};
