import { Link } from '@tanstack/react-router';
import type { ColumnDef, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { ServiceEntity } from '@/api/generated';
import { DataTable } from '@/components/common/DataTable';
import { LanguageBadge } from '@/components/common/LanguageBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePreviewUrl } from '@/hooks/usePreviewUrl';
import { useServerTable } from '@/hooks/useServerTable';
import { formatRelativeDate } from '@/utils/date';
import type { DataTableReorder } from '@/utils/reorder';
import { getTranslationTitle } from '@/utils/translation';
import { getAuthorLabel } from '@/utils/user';

type ServiceTableProps = {
   data: ServiceEntity[];
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

export const ServiceTable = ({
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
}: ServiceTableProps) => {
   const { t, i18n } = useTranslation();
   const openPreview = usePreviewUrl('services');

   const columns: ColumnDef<ServiceEntity>[] = [
      {
         accessorKey: 'title',
         header: t('services.table.name'),
         cell: ({ row }) => (
            <Link
               to="/services/$serviceId"
               params={{ serviceId: row.original.id }}
               className="rounded-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
               {getTranslationTitle(row.original, i18n.language)}
            </Link>
         ),
      },
      {
         accessorKey: 'slug',
         header: t('services.table.slug'),
         enableSorting: false,
         cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">{row.original.slug}</span>
         ),
      },
      {
         accessorKey: 'status',
         header: t('services.table.status'),
         cell: ({ row }) => (
            <StatusBadge
               status={row.original.status}
               label={t(`services.status.${row.original.status}`)}
            />
         ),
      },
      {
         id: 'languages',
         header: t('common.table.languages'),
         cell: ({ row }) => (
            <div className="flex flex-wrap gap-1">
               {row.original.translations.map((t) => (
                  <LanguageBadge key={t.language} language={t.language} />
               ))}
            </div>
         ),
         enableSorting: false,
      },
      {
         accessorKey: 'sortOrder',
         header: t('services.table.sortOrder'),
         sortDescFirst: false,
         cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">{row.original.sortOrder}</span>
         ),
      },
      {
         id: 'createdBy',
         accessorFn: () => '',
         header: t('common.table.author'),
         cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
               {getAuthorLabel(row.original.createdBy)}
            </span>
         ),
      },
      {
         accessorKey: 'updatedAt',
         header: t('services.table.updatedAt'),
         cell: ({ row }) => formatRelativeDate(row.original.updatedAt, i18n.language),
      },
      {
         id: 'actions',
         header: t('services.table.actions'),
         enableSorting: false,
         cell: ({ row }) => (
            <div className="flex gap-2" data-row-click="ignore">
               <Tooltip>
                  <TooltipTrigger asChild>
                     <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('common.preview')}
                        onClick={() => openPreview(row.original.id)}
                     >
                        <Eye className="h-4 w-4" />
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('common.preview')}</TooltipContent>
               </Tooltip>
               <Tooltip>
                  <TooltipTrigger asChild>
                     <Button asChild variant="ghost" size="icon-sm" aria-label={t('common.edit')}>
                        <Link to="/services/$serviceId" params={{ serviceId: row.original.id }}>
                           <Pencil className="h-4 w-4" />
                        </Link>
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('common.edit')}</TooltipContent>
               </Tooltip>
               {onDelete && (
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button
                           variant="ghost"
                           size="icon-sm"
                           aria-label={t('services.delete.title')}
                           onClick={() => onDelete(row.original.id)}
                        >
                           <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent>{t('services.delete.title')}</TooltipContent>
                  </Tooltip>
               )}
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
   });

   return (
      <DataTable
         table={table}
         onRowClick={(row) => onEdit(row.id)}
         rowsHaveLink
         isFetching={isFetching}
         emptyState={emptyState}
         reorder={reorder}
      />
   );
};
