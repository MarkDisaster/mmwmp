import { useQuery } from '@tanstack/react-query';

import { api } from '@/api';
import { rolePermissionsTargetId } from '@/features/ai-chat/utils/summarizeRolePermissions';

export const useCurrentRole = (toolName: string, input: unknown) => {
   const query = useQuery({
      ...api.roles.queries.detailOrSkip(rolePermissionsTargetId(toolName, input)),
      staleTime: 0,
   });
   return query.isFetchedAfterMount && !query.isError ? query.data : undefined;
};
