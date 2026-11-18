import type { PaginationState } from '@tanstack/react-table';
import { useEffect, useEffectEvent } from 'react';

import { getLastPageIfPastEnd } from '@/utils/listSearch';

type ListPaging = { pagination: PaginationState; replacePage: (page: number) => void };

export const useListPageClamp = (list: ListPaging, totalCount: number | undefined) => {
   const { pageIndex, pageSize } = list.pagination;
   const lastPage =
      totalCount === undefined
         ? undefined
         : getLastPageIfPastEnd(pageIndex + 1, pageSize, totalCount);

   const replacePage = useEffectEvent(list.replacePage);

   useEffect(() => {
      if (lastPage !== undefined) replacePage(lastPage);
   }, [lastPage]);
};
