import type { ColumnDef, OnChangeFn, PaginationState } from '@tanstack/react-table';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { DataTablePagination } from '@/components/common/DataTablePagination';

const NO_ROWS: never[] = [];
const NO_COLUMNS: ColumnDef<never>[] = [];

type GridPaginationProps = {
   pagination: PaginationState;
   onPaginationChange: OnChangeFn<PaginationState>;
   totalCount: number;
};

export const GridPagination = ({
   pagination,
   onPaginationChange,
   totalCount,
}: GridPaginationProps) => {
   const table = useReactTable({
      data: NO_ROWS,
      columns: NO_COLUMNS,
      state: { pagination },
      onPaginationChange,
      manualPagination: true,
      rowCount: totalCount,
      getCoreRowModel: getCoreRowModel(),
   });

   return <DataTablePagination table={table} />;
};
