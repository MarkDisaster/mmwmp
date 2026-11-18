import type { QueryKey } from '@tanstack/react-query';

import { queryClient } from '@/utils/query-client';

export const removeUnobservedDetail = (queryKey: QueryKey) => {
   if (queryClient.getQueryCache().find({ queryKey, exact: true })?.getObserversCount()) return;
   queryClient.removeQueries({ queryKey, exact: true });
};
