import type { ColumnDef, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { RoleEntity } from '@/api/generated';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useServerTable } from '@/hooks/useServerTable';
import { formatRelativeDate } from '@/utils/date';
import { getAuthorLabel } from '@/utils/user';

type RoleTableProps = {
   data: RoleEntity[];
   totalCount: number;
   pagination: PaginationState;
   onPaginationChange: OnChangeFn<PaginationState>;
   sorting: SortingState;
   onSortingChange: OnChangeFn<SortingState>;
   onEdit: (id: number) => void;
   onDelete: (id: number) => void;
   canDelete: (role: RoleEntity) => boolean;
   isFetching?: boolean;
   emptyState: ReactNode;
};

export const RoleTable = ({
   data,
   totalCount,
   pagination,
   onPaginationChange,
   sorting,
   onSortingChange,
   onEdit,
   onDelete,
   canDelete,
   isFetching,
   emptyState,
}: RoleTableProps) => {
   const { t, i18n } = useTranslation();

   const columns = useMemo<ColumnDef<RoleEntity>[]>(
      () => [
         {
            accessorKey: 'name',
            header: t('roles.table.name'),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
         },
         {
            id: 'type',
            header: t('roles.table.type'),
            cell: ({ row }) => (
               <div className="flex gap-2">
                  {row.original.isAdmin && <Badge>{t('roles.admin')}</Badge>}
                  {row.original.isSystem && <Badge variant="secondary">{t('roles.system')}</Badge>}
               </div>
            ),
            enableSorting: false,
         },
         {
            id: 'permissions',
            header: t('roles.table.permissions'),
            cell: ({ row }) =>
               row.original.isAdmin ? (
                  <span className="text-sm text-muted-foreground">{t('roles.fullAccess')}</span>
               ) : (
                  <span className="text-sm">
                     {t('roles.permissionsCount', { count: row.original.permissions.length })}
                  </span>
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
            accessorKey: 'updatedAt',
            header: t('roles.table.updatedAt'),
            enableSorting: false,
            cell: ({ row }) => formatRelativeDate(row.original.updatedAt, i18n.language),
         },
         {
            id: 'actions',
            header: t('roles.table.actions'),
            enableSorting: false,
            cell: ({ row }) => (
               <div className="flex gap-2" data-row-click="ignore">
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button
                           variant="ghost"
                           size="icon-sm"
                           aria-label={t('roles.edit')}
                           onClick={() => onEdit(row.original.id)}
                        >
                           <Pencil className="h-4 w-4" />
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent>{t('roles.edit')}</TooltipContent>
                  </Tooltip>
                  {!row.original.isSystem && canDelete(row.original) && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t('roles.delete.title')}
                              onClick={() => onDelete(row.original.id)}
                           >
                              <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('roles.delete.title')}</TooltipContent>
                     </Tooltip>
                  )}
               </div>
            ),
         },
      ],
      [t, i18n.language, onEdit, onDelete, canDelete],
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
      />
   );
};
