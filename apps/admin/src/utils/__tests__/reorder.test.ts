import type { Query } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
   getDropMove,
   getPublishedRowLock,
   isSavedOrderList,
   isSavedOrderSort,
   moveRow,
} from '../reorder';

const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

const ids = (list: { id: number }[]) => list.map((row) => row.id);

describe('moveRow', () => {
   it('should place the row before or after the target when dragged down', () => {
      expect(ids(moveRow(rows, { id: 1, targetId: 3, position: 'after' }))).toEqual([2, 3, 1, 4]);
      expect(ids(moveRow(rows, { id: 1, targetId: 3, position: 'before' }))).toEqual([2, 1, 3, 4]);
   });

   it('should place the row before or after the target when dragged up', () => {
      expect(ids(moveRow(rows, { id: 4, targetId: 2, position: 'before' }))).toEqual([1, 4, 2, 3]);
      expect(ids(moveRow(rows, { id: 4, targetId: 1, position: 'before' }))).toEqual([4, 1, 2, 3]);
   });

   it('should move a row to the end', () => {
      expect(ids(moveRow(rows, { id: 2, targetId: 4, position: 'after' }))).toEqual([1, 3, 4, 2]);
   });

   it('should return the same rows when the moved or the target row is not on the page', () => {
      expect(moveRow(rows, { id: 9, targetId: 2, position: 'before' })).toBe(rows);
      expect(moveRow(rows, { id: 2, targetId: 9, position: 'before' })).toBe(rows);
      expect(moveRow(rows, { id: 2, targetId: 2, position: 'before' })).toBe(rows);
   });

   it('should not change the input array', () => {
      moveRow(rows, { id: 1, targetId: 4, position: 'after' });
      expect(ids(rows)).toEqual([1, 2, 3, 4]);
   });
});

describe('isSavedOrderSort', () => {
   it('should accept no sort and an ascending sort by the saved order only', () => {
      expect(isSavedOrderSort()).toBe(true);
      expect(isSavedOrderSort('sortOrder')).toBe(true);
      expect(isSavedOrderSort('sortOrder', 'asc')).toBe(true);
      expect(isSavedOrderSort('sortOrder', 'desc')).toBe(false);
      expect(isSavedOrderSort('name', 'asc')).toBe(false);
   });
});

const queryWithKey = (queryKey: unknown[]) => ({ queryKey }) as unknown as Query;

describe('isSavedOrderList', () => {
   it('should accept a list in the saved order, also when searched or filtered', () => {
      expect(isSavedOrderList(queryWithKey(['projects', 'list']))).toBe(true);
      expect(isSavedOrderList(queryWithKey(['projects', 'list', undefined]))).toBe(true);
      expect(isSavedOrderList(queryWithKey(['projects', 'list', {}]))).toBe(true);
      expect(
         isSavedOrderList(queryWithKey(['projects', 'list', { search: 'a', status: 'DRAFT' }])),
      ).toBe(true);
      expect(isSavedOrderList(queryWithKey(['projects', 'list', { sortBy: 'sortOrder' }]))).toBe(
         true,
      );
   });

   it('should reject a list sorted by another column or in reverse', () => {
      expect(isSavedOrderList(queryWithKey(['projects', 'list', { sortBy: 'title' }]))).toBe(false);
      expect(
         isSavedOrderList(
            queryWithKey(['projects', 'list', { sortBy: 'sortOrder', sortOrder: 'desc' }]),
         ),
      ).toBe(false);
   });
});

describe('getPublishedRowLock', () => {
   const list = [
      { id: 1, status: 'draft' },
      { id: 2, status: 'published' },
   ];

   it('should lock the published rows of a role without the publish permission', () => {
      const isLocked = getPublishedRowLock(list, false);

      expect(isLocked?.('1')).toBe(false);
      expect(isLocked?.('2')).toBe(true);
   });

   it('should lock nothing for a role with the publish permission', () => {
      expect(getPublishedRowLock(list, true)).toBeUndefined();
   });
});

describe('getDropMove', () => {
   const ids = ['1', '2', '3', '4'];

   it('should land after the target when the item is dragged forward', () => {
      expect(getDropMove(ids, '1', '3')).toEqual({ id: '1', targetId: '3', position: 'after' });
   });

   it('should land before the target when the item is dragged back', () => {
      expect(getDropMove(ids, '4', '2')).toEqual({ id: '4', targetId: '2', position: 'before' });
   });

   it('should return null when nothing moved or an item is missing', () => {
      expect(getDropMove(ids, '2', '2')).toBeNull();
      expect(getDropMove(ids, '9', '2')).toBeNull();
      expect(getDropMove(ids, '2', '9')).toBeNull();
   });
});
