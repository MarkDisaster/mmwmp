import { cn } from '@mm/utils/cn';
import type { ColumnDef, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { TrashedItemEntity } from '@/api/generated';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useServerTable } from '@/hooks/useServerTable';
import { formatDate } from '@/utils/date';

type TrashTableProps = {
   data: TrashedItemEntity[];
   totalCount: number;
   pagination: PaginationState;
   onPaginationChange: OnChangeFn<PaginationState>;
   sorting: SortingState;
   onSortingChange: OnChangeFn<SortingState>;
   onRestore: (item: TrashedItemEntity) => void;
   onDeletePermanently: (item: TrashedItemEntity) => void;
   isFetching?: boolean;
   emptyState: ReactNode;
};

const DUE_SOON_DAYS = 3;

export const TrashTable = ({
   data,
   totalCount,
   pagination,
   onPaginationChange,
   sorting,
   onSortingChange,
   onRestore,
   onDeletePermanently,
   isFetching,
   emptyState,
}: TrashTableProps) => {
   const { t, i18n } = useTranslation();

   const columns: ColumnDef<TrashedItemEntity>[] = [
      {
         accessorKey: 'title',
         header: t('trash.table.name'),
         cell: ({ row }) => (
            <div className="min-w-0">
               <div className="truncate font-medium">{row.original.title || '—'}</div>
               {row.original.originalSlug && (
                  <div className="truncate text-xs text-muted-foreground">
                     {row.original.originalSlug}
                  </div>
               )}
            </div>
         ),
      },
      {
         accessorKey: 'deletedAt',
         header: t('trash.table.deletedAt'),
         cell: ({ row }) => formatDate(row.original.deletedAt, i18n.language),
      },
      {
         id: 'deletedBy',
         header: t('trash.table.deletedBy'),
         enableSorting: false,
         cell: ({ row }) => {
            const user = row.original.deletedBy;
            return (
               <span className={cn(!user && 'text-muted-foreground')}>
                  {user ? `${user.firstName} ${user.lastName}` : t('trash.unknownUser')}
               </span>
            );
         },
      },
      {
         id: 'daysLeft',
         header: t('trash.table.daysLeft'),
         enableSorting: false,
         cell: ({ row }) => {
            const { daysLeft } = row.original;
            return (
               <Badge variant={daysLeft <= DUE_SOON_DAYS ? 'destructive' : 'secondary'}>
                  {daysLeft === 0 ? t('trash.dueSoon') : t('trash.daysLeft', { count: daysLeft })}
               </Badge>
            );
         },
      },
      {
         id: 'actions',
         header: t('trash.table.actions'),
         enableSorting: false,
         cell: ({ row }) => (
            <div className="flex gap-2" data-row-click="ignore">
               <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('trash.restore')}
                  title={t('trash.restore')}
                  onClick={() => onRestore(row.original)}
               >
                  <RotateCcw className="h-4 w-4" />
               </Button>
               <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('trash.deletePermanently')}
                  title={t('trash.deletePermanently')}
                  onClick={() => onDeletePermanently(row.original)}
               >
                  <Trash2 className="h-4 w-4 text-destructive" />
               </Button>
            </div>
         ),
      },
   ];

   const table = useServerTable({
      data,
      columns,
      totalCount,
      pagination,
      onPaginationChange,
      sorting,
      onSortingChange,
      enableSortingRemoval: false,
   });

   return <DataTable table={table} isFetching={isFetching} emptyState={emptyState} />;
};
