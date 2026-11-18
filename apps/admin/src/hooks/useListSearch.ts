import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';

import { useDebouncedParam } from '@/hooks/useDebouncedParam';
import { hasListFilters, patchListSearch } from '@/utils/listSearch';
import { fromSortingState, type ListSort, toSortingState, toSortParams } from '@/utils/sorting';

type ListSearch = ListSort & {
   page: number;
   pageSize: number;
   search?: string;
};

type NavigateOptions = { replace?: boolean };

export type NavigateListSearch<T> = (search: (prev: T) => T, options?: NavigateOptions) => void;

export const useListSearch = <T extends ListSearch>(
   listSearch: T,
   navigateSearch: NavigateListSearch<T>,
) => {
   const pagination: PaginationState = {
      pageIndex: listSearch.page - 1,
      pageSize: listSearch.pageSize,
   };
   const sorting = toSortingState(listSearch);

   const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      navigateSearch((prev) => ({ ...prev, page: next.pageIndex + 1, pageSize: next.pageSize }));
   };

   const onSortingChange: OnChangeFn<SortingState> = (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      navigateSearch((prev) => patchListSearch(prev, fromSortingState(next)));
   };

   const replacePage = (page: number) =>
      navigateSearch((prev) => ({ ...prev, page }), { replace: true });

   const setFilters = (patch: Partial<Omit<T, keyof ListSearch>>, options?: NavigateOptions) =>
      navigateSearch((prev) => patchListSearch(prev, patch), options);

   const [searchValue, onSearchChange] = useDebouncedParam(listSearch.search ?? '', (search) =>
      navigateSearch((prev) => patchListSearch(prev, { search }), { replace: true }),
   );

   return {
      pagination,
      onPaginationChange,
      replacePage,
      sorting,
      onSortingChange,
      setFilters,
      searchValue,
      onSearchChange,
      isFiltered: hasListFilters(listSearch),
      listParams: {
         page: pagination.pageIndex,
         limit: pagination.pageSize,
         search: listSearch.search || undefined,
         ...toSortParams(listSearch),
      },
   };
};
