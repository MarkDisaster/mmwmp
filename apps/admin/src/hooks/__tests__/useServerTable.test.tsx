import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useServerTable } from '../useServerTable';

type Row = { id: number; name: string };

const DATA: Row[] = [
   { id: 7, name: 'b' },
   { id: 9, name: 'a' },
];
const COLUMNS: ColumnDef<Row>[] = [{ accessorKey: 'name' }];
const PAGINATION = { pageIndex: 0, pageSize: 10 };

const renderTable = (
   options: { sorting?: SortingState; enableSortingRemoval?: boolean } = {},
   totalCount = 45,
) => {
   const onSortingChange = vi.fn();
   const { result } = renderHook(() =>
      useServerTable({
         data: DATA,
         columns: COLUMNS,
         totalCount,
         pagination: PAGINATION,
         onPaginationChange: vi.fn(),
         onSortingChange: options.sorting ? onSortingChange : undefined,
         ...options,
      }),
   );
   return { table: result.current, onSortingChange };
};

const nextSorting = (onSortingChange: ReturnType<typeof vi.fn>, current: SortingState) => {
   const updater = onSortingChange.mock.calls[0][0] as (prev: SortingState) => SortingState;
   return updater(current);
};

describe('useServerTable', () => {
   it('should key the rows by the record id, not by the position on the page', () => {
      const { table } = renderTable();

      expect(table.getRowModel().rows.map((row) => row.id)).toEqual(['7', '9']);
   });

   it('should show the rows as the API returned them and count the pages from the total', () => {
      const { table } = renderTable({ sorting: [{ id: 'name', desc: false }] });

      expect(table.getRowModel().rows.map((row) => row.original.name)).toEqual(['b', 'a']);
      expect(table.getPageCount()).toBe(5);
      expect(renderTable({}, 0).table.getPageCount()).toBe(0);
   });

   it('should clear the sorting on the third click by default, back to the API order', () => {
      const sorting = [{ id: 'name', desc: true }];
      const { table, onSortingChange } = renderTable({ sorting });

      table.getColumn('name')?.toggleSorting();

      expect(nextSorting(onSortingChange, sorting)).toEqual([]);
   });

   it('should only reverse the sorting of a list with a default sorting', () => {
      const sorting = [{ id: 'name', desc: true }];
      const { table, onSortingChange } = renderTable({ sorting, enableSortingRemoval: false });

      table.getColumn('name')?.toggleSorting();

      expect(nextSorting(onSortingChange, sorting)).toEqual([{ id: 'name', desc: false }]);
   });

   it('should work for a list the API does not sort', () => {
      const { table } = renderTable();

      expect(table.getState().sorting).toEqual([]);
      expect(table.getState().pagination).toEqual(PAGINATION);
   });
});
