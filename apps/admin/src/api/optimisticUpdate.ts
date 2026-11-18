import type { QueryKey } from '@tanstack/react-query';

import { queryClient } from '@/utils/query-client';

type OptimisticSnapshot = { queryKey: QueryKey; previous: unknown };

export const optimisticUpdate = <TVariables, TData>(
   getQueryKey: (variables: TVariables) => QueryKey,
   patch: (old: TData, variables: TVariables) => TData,
) => ({
   onMutate: async (variables: TVariables): Promise<OptimisticSnapshot> => {
      const queryKey = getQueryKey(variables);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData<TData>(queryKey, (old) => (old ? patch(old, variables) : old));
      return { queryKey, previous };
   },
   onError: (_error: unknown, _variables: TVariables, snapshot: OptimisticSnapshot | undefined) => {
      if (snapshot) queryClient.setQueryData(snapshot.queryKey, snapshot.previous);
   },
});
