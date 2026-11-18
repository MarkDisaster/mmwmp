import { describe, expect, it } from 'vitest';

import {
   getLastPageIfPastEnd,
   hasListFilters,
   paginatedSearchSchema,
   patchListSearch,
   SORTED_LIST_SEARCH_DEFAULTS,
   sortedListSearchSchema,
} from '../listSearch';

const schema = sortedListSearchSchema(['name', 'createdAt']);

describe('sortedListSearchSchema', () => {
   it('should fill in the defaults for an empty URL', () => {
      expect(schema.parse({})).toEqual(SORTED_LIST_SEARCH_DEFAULTS);
   });

   it('should keep valid values', () => {
      const search = { page: 3, pageSize: 50, search: 'web', sort: 'createdAt', order: 'desc' };
      expect(schema.parse(search)).toEqual(search);
   });

   it('should replace each invalid value with its default instead of failing', () => {
      expect(
         schema.parse({ page: 'abc', pageSize: 13, search: 42, sort: 'password', order: 'up' }),
      ).toEqual({ ...SORTED_LIST_SEARCH_DEFAULTS, sort: undefined });
   });

   it('should reject pages below one and fractional pages', () => {
      expect(schema.parse({ page: 0 }).page).toBe(1);
      expect(schema.parse({ page: -2 }).page).toBe(1);
      expect(schema.parse({ page: 1.5 }).page).toBe(1);
   });

   it('should keep a valid value next to an invalid one', () => {
      expect(schema.parse({ page: 2, sort: 'unknown' })).toMatchObject({
         page: 2,
         sort: undefined,
      });
   });
});

describe('paginatedSearchSchema', () => {
   it('should only know the paging params', () => {
      expect(paginatedSearchSchema.parse({ page: 2, search: 'x', sort: 'name' })).toEqual({
         page: 2,
         pageSize: 10,
      });
   });
});

describe('patchListSearch', () => {
   const prev = { page: 4, pageSize: 20, search: 'web', sort: 'name', status: undefined };

   it('should go back to the first page when the search changes', () => {
      expect(patchListSearch(prev, { search: 'app' })).toEqual({ ...prev, search: 'app', page: 1 });
   });

   it('should go back to the first page when the sorting or a filter changes', () => {
      expect(patchListSearch(prev, { sort: 'createdAt', order: 'desc' }).page).toBe(1);
      expect(patchListSearch(prev, { status: 'draft' })).toEqual({
         ...prev,
         status: 'draft',
         page: 1,
      });
   });

   it('should keep the page when nothing changes', () => {
      expect(patchListSearch(prev, { search: 'web' })).toBe(prev);
      expect(patchListSearch(prev, { status: undefined })).toBe(prev);
   });

   it('should clear a filter and go back to the first page', () => {
      expect(patchListSearch({ ...prev, status: 'draft' }, { status: undefined })).toEqual({
         ...prev,
         page: 1,
      });
   });
});

describe('hasListFilters', () => {
   it('should ignore paging and sorting', () => {
      expect(
         hasListFilters({ page: 3, pageSize: 50, sort: 'name', order: 'desc', search: '' }),
      ).toBe(false);
   });

   it('should count a search and any set filter', () => {
      expect(hasListFilters({ page: 1, search: 'web' })).toBe(true);
      expect(hasListFilters({ page: 1, search: '', status: 'draft' })).toBe(true);
      expect(hasListFilters({ page: 1, action: '', from: '2026-01-01' })).toBe(true);
   });

   it('should not count filters that are unset or empty', () => {
      expect(hasListFilters({ page: 1, search: '', status: undefined, action: '' })).toBe(false);
   });
});

describe('getLastPageIfPastEnd', () => {
   it('should return the last page for a page past the end', () => {
      expect(getLastPageIfPastEnd(3, 10, 20)).toBe(2);
      expect(getLastPageIfPastEnd(9, 10, 21)).toBe(3);
   });

   it('should keep a page within the list', () => {
      expect(getLastPageIfPastEnd(1, 10, 5)).toBeUndefined();
      expect(getLastPageIfPastEnd(2, 10, 20)).toBeUndefined();
   });

   it('should keep the first page of an empty list, which shows its empty state', () => {
      expect(getLastPageIfPastEnd(1, 10, 0)).toBeUndefined();
      expect(getLastPageIfPastEnd(4, 10, 0)).toBeUndefined();
   });
});
