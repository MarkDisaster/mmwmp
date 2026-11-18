import type { ColumnDef, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { TagEntity } from '@/api/generated';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DEFAULT_COLOR_FALLBACK } from '@/features/tags/constants';
import { useServerTable } from '@/hooks/useServerTable';
import { formatDate } from '@/utils/date';
import type { DataTableReorder } from '@/utils/reorder';
import { getTagName } from '@/utils/tag';
import { getAuthorLabel } from '@/utils/user';

type TagTableProps = {
   data: TagEntity[];
   totalCount: number;
   pagination: PaginationState;
   onPaginationChange: OnChangeFn<PaginationState>;
   sorting: SortingState;
   onSortingChange: OnChangeFn<SortingState>;
   onEdit: (id: number) => void;
   onDelete?: (id: number) => void;
   reorder?: DataTableReorder;
   isFetching?: boolean;
   emptyState: ReactNode;
};

export const TagTable = ({
   data,
   totalCount,
   pagination,
   onPaginationChange,
   sorting,
   onSortingChange,
   onEdit,
   onDelete,
   reorder,
   isFetching,
   emptyState,
}: TagTableProps) => {
   const { t, i18n } = useTranslation();

   const columns = useMemo<ColumnDef<TagEntity>[]>(
      () => [
         {
            id: 'name',
            accessorFn: (tag) => getTagName(tag, i18n.language),
            header: t('tags.table.name'),
            cell: ({ row }) => (
               <span className="font-medium">{getTagName(row.original, i18n.language)}</span>
            ),
         },
         {
            accessorKey: 'slug',
            header: t('tags.table.slug'),
            cell: ({ row }) => (
               <span className="text-sm text-muted-foreground">{row.original.slug}</span>
            ),
         },
         {
            accessorKey: 'color',
            header: t('tags.table.color'),
            cell: ({ row }) => (
               <div className="flex items-center gap-2">
                  <div
                     className="h-4 w-4 shrink-0 rounded-full border"
                     style={{ backgroundColor: row.original.color ?? DEFAULT_COLOR_FALLBACK }}
                  />
                  <span className="text-sm">{row.original.color ?? '—'}</span>
               </div>
            ),
            enableSorting: false,
         },
         {
            id: 'createdBy',
            accessorFn: () => '',
            header: t('common.table.author'),
            enableSorting: false,
            cell: ({ row }) => (
               <span className="text-sm text-muted-foreground">
                  {getAuthorLabel(row.original.createdBy)}
               </span>
            ),
         },
         {
            accessorKey: 'sortOrder',
            header: t('tags.table.sortOrder'),
            sortDescFirst: false,
            cell: ({ row }) => (
               <span className="text-sm text-muted-foreground">{row.original.sortOrder}</span>
            ),
         },
         {
            accessorKey: 'createdAt',
            header: t('tags.table.createdAt'),
            cell: ({ row }) => formatDate(row.original.createdAt, i18n.language),
         },
         {
            accessorKey: 'updatedAt',
            header: t('tags.table.updatedAt'),
            cell: ({ row }) => formatDate(row.original.updatedAt, i18n.language),
         },
         {
            id: 'actions',
            header: t('tags.table.actions'),
            enableSorting: false,
            cell: ({ row }) => (
               <div className="flex gap-2" data-row-click="ignore">
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button
                           variant="ghost"
                           size="icon-sm"
                           aria-label={t('tags.edit')}
                           onClick={() => onEdit(row.original.id)}
                        >
                           <Pencil className="h-4 w-4" />
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent>{t('tags.edit')}</TooltipContent>
                  </Tooltip>
                  {onDelete && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t('tags.delete.title')}
                              onClick={() => onDelete(row.original.id)}
                           >
                              <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('tags.delete.title')}</TooltipContent>
                     </Tooltip>
                  )}
               </div>
            ),
         },
      ],
      [t, i18n.language, onEdit, onDelete],
   );

   const table = useServerTable({
      data,
      columns,
      totalCount,
      pagination,
      onPaginationChange,
      sorting,
      onSortingChange,
   });

   return (
      <DataTable
         table={table}
         onRowClick={(row) => onEdit(row.id)}
         isFetching={isFetching}
         emptyState={emptyState}
         reorder={reorder}
      />
   );
};
