import type { ColumnDef, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { Mail, Pencil, Shield, Trash2, UserCheck, UserX } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { UserEntity } from '@/api/generated';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useServerTable } from '@/hooks/useServerTable';
import { formatRelativeDate } from '@/utils/date';
import { canManageUser } from '@/utils/permission';

type UserTableProps = {
   data: UserEntity[];
   totalCount: number;
   pagination: PaginationState;
   onPaginationChange: OnChangeFn<PaginationState>;
   sorting: SortingState;
   onSortingChange: OnChangeFn<SortingState>;
   actor: Pick<UserEntity, 'id' | 'role'> | null;
   onEdit?: (user: UserEntity) => void;
   onDelete?: (id: number) => void;
   onDeactivate?: (user: UserEntity) => void;
   onReactivate?: (user: UserEntity) => void;
   onResend?: (id: number) => void;
   onChangeRole?: (user: UserEntity) => void;
   isFetching?: boolean;
   emptyState: ReactNode;
};

const canChangeUser = (user: UserEntity, actor: UserTableProps['actor']) =>
   !!actor && !user.deletedAt && canManageUser(user, actor);

export const UserTable = ({
   data,
   totalCount,
   pagination,
   onPaginationChange,
   sorting,
   onSortingChange,
   actor,
   onEdit,
   onDelete,
   onDeactivate,
   onReactivate,
   onResend,
   onChangeRole,
   isFetching,
   emptyState,
}: UserTableProps) => {
   const { t, i18n } = useTranslation();

   const columns = useMemo<ColumnDef<UserEntity>[]>(() => {
      const getStatus = (user: UserEntity): ReactNode => {
         if (user.deletedAt) return t('users.status.deleted');
         if (user.deactivatedAt) {
            return <Badge variant="destructive">{t('users.status.deactivated')}</Badge>;
         }
         if (user.acceptedInvitationAt === null) return t('users.status.pending');
         return t('users.status.active');
      };

      return [
         {
            id: 'firstName',
            accessorFn: () => '',
            header: t('users.table.name'),
            cell: ({ row }) => (
               <span className="font-medium">
                  {row.original.firstName} {row.original.lastName}
               </span>
            ),
         },
         {
            accessorKey: 'email',
            header: t('users.table.email'),
         },
         {
            accessorKey: 'role',
            header: t('users.table.role'),
            cell: ({ row }) => (
               <Badge variant={row.original.role.isAdmin ? 'default' : 'secondary'}>
                  {row.original.role.name}
               </Badge>
            ),
            enableSorting: false,
         },
         {
            id: 'status',
            header: t('users.table.status'),
            cell: ({ row }) => getStatus(row.original),
            enableSorting: false,
         },
         {
            accessorKey: 'createdAt',
            header: t('users.table.createdAt'),
            cell: ({ row }) => formatRelativeDate(row.original.createdAt, i18n.language),
         },
         {
            accessorKey: 'updatedAt',
            header: t('users.table.updatedAt'),
            enableSorting: false,
            cell: ({ row }) => formatRelativeDate(row.original.updatedAt, i18n.language),
         },
         {
            id: 'actions',
            header: t('users.table.actions'),
            enableSorting: false,
            cell: ({ row }) => {
               const user = row.original;
               const canChange = canChangeUser(user, actor);

               return (
                  <div className="flex items-center gap-1">
                     {canChange && onEdit && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="icon-sm"
                                 aria-label={t('common.edit')}
                                 onClick={() => onEdit(user)}
                              >
                                 <Pencil className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>{t('common.edit')}</TooltipContent>
                        </Tooltip>
                     )}
                     {canChange && onResend && user.acceptedInvitationAt === null && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="icon-sm"
                                 aria-label={t('users.actions.resendInvitation')}
                                 onClick={() => onResend(user.id)}
                              >
                                 <Mail className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>{t('users.actions.resendInvitation')}</TooltipContent>
                        </Tooltip>
                     )}
                     {canChange && onChangeRole && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="icon-sm"
                                 aria-label={t('users.actions.changeRole')}
                                 onClick={() => onChangeRole(user)}
                              >
                                 <Shield className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>{t('users.actions.changeRole')}</TooltipContent>
                        </Tooltip>
                     )}
                     {canChange && onDeactivate && !user.deactivatedAt && (
                        <Button
                           variant="ghost"
                           size="icon-sm"
                           aria-label={t('users.actions.deactivate')}
                           title={t('users.actions.deactivate')}
                           onClick={() => onDeactivate(user)}
                        >
                           <UserX className="h-4 w-4" />
                        </Button>
                     )}
                     {canChange && onReactivate && user.deactivatedAt && (
                        <Button
                           variant="ghost"
                           size="icon-sm"
                           aria-label={t('users.actions.reactivate')}
                           title={t('users.actions.reactivate')}
                           onClick={() => onReactivate(user)}
                        >
                           <UserCheck className="h-4 w-4" />
                        </Button>
                     )}
                     {canChange && onDelete && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="icon-sm"
                                 aria-label={t('users.delete.title')}
                                 onClick={() => onDelete(user.id)}
                              >
                                 <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>{t('users.delete.title')}</TooltipContent>
                        </Tooltip>
                     )}
                  </div>
               );
            },
         },
      ];
   }, [
      t,
      i18n.language,
      actor,
      onEdit,
      onDelete,
      onDeactivate,
      onReactivate,
      onResend,
      onChangeRole,
   ]);

   const table = useServerTable({
      data,
      columns,
      totalCount,
      pagination,
      onPaginationChange,
      sorting,
      onSortingChange,
   });

   return <DataTable table={table} isFetching={isFetching} emptyState={emptyState} />;
};
