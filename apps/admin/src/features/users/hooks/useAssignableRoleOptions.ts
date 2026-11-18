import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { api } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { canAssignRole } from '@/utils/permission';

export const useAssignableRoleOptions = () => {
   const canReadRoles = usePermission('roles', 'read');
   const { data } = useQuery({ ...api.roles.queries.all(), enabled: canReadRoles });
   const { user } = useAuth();
   const actorRole = user?.role;

   return useMemo(
      () =>
         actorRole
            ? (data?.data ?? [])
                 .filter((role) => canAssignRole(role, actorRole))
                 .map((role) => ({ value: String(role.id), label: role.name }))
            : [],
      [data, actorRole],
   );
};
