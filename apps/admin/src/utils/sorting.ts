import type { SortingState } from '@tanstack/react-table';

type SortOrder = 'asc' | 'desc';

export type ListSort = {
   sort?: string;
   order?: SortOrder;
};

export const fromSortingState = ([first]: SortingState): ListSort =>
   first
      ? { sort: first.id, order: first.desc ? 'desc' : 'asc' }
      : { sort: undefined, order: undefined };

export const toSortingState = ({ sort, order }: ListSort): SortingState =>
   sort ? [{ id: sort, desc: order === 'desc' }] : [];

export const toSortParams = ({ sort, order }: ListSort) => ({
   sortBy: sort,
   sortOrder: sort ? order : undefined,
});
