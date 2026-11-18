import { z } from 'zod/v4';

import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/constants/pagination';

export const paginatedSearchSchema = z.object({
   page: z.int().min(1).default(1).catch(1),
   pageSize: z.literal(PAGE_SIZE_OPTIONS).default(DEFAULT_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE),
});

const listSearchSchema = paginatedSearchSchema.extend({
   search: z.string().default('').catch(''),
});

export const sortedListSearchSchema = <const TSort extends readonly [string, ...string[]]>(
   sortFields: TSort,
) =>
   listSearchSchema.extend({
      sort: z.enum(sortFields).optional().catch(undefined),
      order: z.enum(['asc', 'desc']).default('asc').catch('asc'),
   });

export const PAGINATED_SEARCH_DEFAULTS = { page: 1, pageSize: DEFAULT_PAGE_SIZE } as const;
const LIST_SEARCH_DEFAULTS = { ...PAGINATED_SEARCH_DEFAULTS, search: '' } as const;
export const SORTED_LIST_SEARCH_DEFAULTS = { ...LIST_SEARCH_DEFAULTS, order: 'asc' } as const;

const VIEW_PARAMS = new Set(['page', 'pageSize', 'sort', 'order']);

export const patchListSearch = <T extends { page: number }>(prev: T, patch: object): T => {
   const changed = Object.entries(patch).some(([key, value]) => prev[key as keyof T] !== value);
   return changed ? { ...prev, ...patch, page: 1 } : prev;
};

export const hasListFilters = (search: object) =>
   Object.entries(search).some(
      ([key, value]) => !VIEW_PARAMS.has(key) && value !== undefined && value !== '',
   );

export const getLastPageIfPastEnd = (page: number, pageSize: number, totalCount: number) => {
   const pageCount = Math.ceil(totalCount / pageSize);
   return totalCount > 0 && page > pageCount ? pageCount : undefined;
};
