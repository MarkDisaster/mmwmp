import type { RowData, Table } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';

import {
   Pagination,
   PaginationButton,
   PaginationContent,
   PaginationEllipsis,
   PaginationItem,
   PaginationNext,
   PaginationPrevious,
} from '@/components/ui/pagination';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZE_OPTIONS } from '@/constants/pagination';
import { getPageNumbers } from '@/utils/pagination';

type DataTablePaginationProps<TData extends RowData> = {
   table: Table<TData>;
};

const DataTablePagination = <TData extends RowData>({ table }: DataTablePaginationProps<TData>) => {
   const { t } = useTranslation();
   const pageIndex = table.getState().pagination.pageIndex;
   const pageCount = table.getPageCount();

   return (
      <div className="flex items-center justify-between px-2 py-4">
         <div className="text-sm text-muted-foreground">
            {t('common.pagination.total', { count: table.getRowCount() })}
         </div>

         <Pagination aria-label={t('common.pagination.label')} className="mx-0 w-auto">
            <PaginationContent>
               <PaginationItem>
                  <PaginationPrevious
                     onClick={() => table.previousPage()}
                     disabled={!table.getCanPreviousPage()}
                  >
                     {t('common.pagination.previous')}
                  </PaginationPrevious>
               </PaginationItem>

               {getPageNumbers(pageIndex, pageCount).map((page, i) =>
                  page === 'ellipsis' ? (
                     <PaginationItem key={`ellipsis-${i}`}>
                        <PaginationEllipsis />
                     </PaginationItem>
                  ) : (
                     <PaginationItem key={page}>
                        <PaginationButton
                           isActive={page === pageIndex}
                           aria-label={t('common.pagination.page', { page: page + 1 })}
                           onClick={() => table.setPageIndex(page)}
                        >
                           {page + 1}
                        </PaginationButton>
                     </PaginationItem>
                  ),
               )}

               <PaginationItem>
                  <PaginationNext
                     onClick={() => table.nextPage()}
                     disabled={!table.getCanNextPage()}
                  >
                     {t('common.pagination.next')}
                  </PaginationNext>
               </PaginationItem>
            </PaginationContent>
         </Pagination>

         <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('common.pagination.perPage')}</span>
            <Select
               value={String(table.getState().pagination.pageSize)}
               onValueChange={(value) => table.setPageSize(Number(value))}
            >
               <SelectTrigger className="h-8 w-18">
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                     <SelectItem key={size} value={String(size)}>
                        {size}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>
      </div>
   );
};

export { DataTablePagination };
