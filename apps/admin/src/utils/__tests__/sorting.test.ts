import { describe, expect, it } from 'vitest';

import { fromSortingState, toSortingState, toSortParams } from '../sorting';

describe('toSortParams', () => {
   it('should send the column and its direction', () => {
      expect(toSortParams({ sort: 'name', order: 'asc' })).toEqual({
         sortBy: 'name',
         sortOrder: 'asc',
      });
      expect(toSortParams({ sort: 'createdAt', order: 'desc' })).toEqual({
         sortBy: 'createdAt',
         sortOrder: 'desc',
      });
   });

   it('should send no direction without a column, leaving the order to the API', () => {
      expect(toSortParams({ sort: undefined, order: 'desc' })).toEqual({
         sortBy: undefined,
         sortOrder: undefined,
      });
   });
});

describe('fromSortingState', () => {
   it('should take the first sorted column', () => {
      expect(
         fromSortingState([
            { id: 'name', desc: true },
            { id: 'createdAt', desc: false },
         ]),
      ).toEqual({ sort: 'name', order: 'desc' });
      expect(fromSortingState([{ id: 'name', desc: false }])).toEqual({
         sort: 'name',
         order: 'asc',
      });
   });

   it('should clear both params when nothing is sorted', () => {
      expect(fromSortingState([])).toEqual({ sort: undefined, order: undefined });
   });
});

describe('toSortingState', () => {
   it('should be the inverse of fromSortingState', () => {
      const sorting = [{ id: 'name', desc: true }];
      expect(toSortingState(fromSortingState(sorting))).toEqual(sorting);
      expect(toSortingState(fromSortingState([]))).toEqual([]);
   });

   it('should read a missing direction as ascending', () => {
      expect(toSortingState({ sort: 'name' })).toEqual([{ id: 'name', desc: false }]);
   });
});
