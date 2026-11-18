import {
   type ColumnDef,
   getCoreRowModel,
   type OnChangeFn,
   type PaginationState,
   type SortingState,
   useReactTable,
} from '@tanstack/react-table';

type ServerTableOptions<TData extends { id: number }> = {
   data: TData[];
   columns: ColumnDef<TData>[];
   totalCount: number;
   pagination: PaginationState;
   onPaginationChange: OnChangeFn<PaginationState>;
   sorting?: SortingState;
   onSortingChange?: OnChangeFn<SortingState>;
   enableSortingRemoval?: boolean;
};

export const useServerTable = <TData extends { id: number }>({
   data,
   columns,
   totalCount,
   pagination,
   onPaginationChange,
   sorting,
   onSortingChange,
   enableSortingRemoval,
}: ServerTableOptions<TData>) =>
   useReactTable({
      data,
      columns,
      state: sorting ? { pagination, sorting } : { pagination },
      onPaginationChange,
      onSortingChange,
      manualPagination: true,
      manualSorting: true,
      enableSortingRemoval,
      rowCount: totalCount,
      getRowId: (row) => String(row.id),
      getCoreRowModel: getCoreRowModel(),
   });
