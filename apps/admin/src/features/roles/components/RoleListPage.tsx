import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { RoleEntity } from '@/api/generated';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { NoRecords } from '@/components/common/NoRecords';
import { NoResults } from '@/components/common/NoResults';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { SearchInput } from '@/components/common/SearchInput';
import { SkeletonListPage } from '@/components/common/SkeletonListPage';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useListPageClamp } from '@/hooks/useListPageClamp';
import { useListSearch } from '@/hooks/useListSearch';
import { usePermission } from '@/hooks/usePermission';
import { canManageRole } from '@/utils/permission';

import { RoleTable } from './RoleTable';

const routeApi = getRouteApi('/_authenticated/roles/');

export const RoleListPage = () => {
   const { t } = useTranslation();
   const navigate = routeApi.useNavigate();
   const list = useListSearch(routeApi.useSearch(), (search, options) =>
      navigate({ search, ...options }),
   );
   const [deleteId, setDeleteId] = useState<number | null>(null);

   const { data, isLoading, isPlaceholderData, isLoadingError, isFetching, refetch } = useQuery(
      api.roles.queries.all(list.listParams),
   );
   useListPageClamp(list, isPlaceholderData ? undefined : data?.totalCount);
   const deleteRole = useMutation(api.roles.mutations.remove);
   const { user } = useAuth();
   const canCreate = usePermission('roles', 'create');
   const canDeleteRoles = usePermission('roles', 'delete');
   const actorRole = user?.role;

   const canDelete = useCallback(
      (role: RoleEntity) => canDeleteRoles && !!actorRole && canManageRole(role, actorRole),
      [canDeleteRoles, actorRole],
   );

   const handleEdit = useCallback(
      (id: number) => navigate({ to: '/roles/$roleId', params: { roleId: id } }),
      [navigate],
   );

   if (isLoading) {
      return <SkeletonListPage cols={6} rowContent="actions" actions={['w-64', 'w-28']} />;
   }

   return (
      <div className="space-y-4">
         <PageHeader
            title={t('roles.title')}
            actions={
               <div className="flex flex-wrap items-center gap-3">
                  <SearchInput value={list.searchValue} onChange={list.onSearchChange} />
                  {canCreate && (
                     <Button onClick={() => navigate({ to: '/roles/create' })}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('roles.create')}
                     </Button>
                  )}
               </div>
            }
         />

         {isLoadingError ? (
            <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
         ) : (
            <RoleTable
               data={data?.data ?? []}
               totalCount={data?.totalCount ?? 0}
               pagination={list.pagination}
               onPaginationChange={list.onPaginationChange}
               sorting={list.sorting}
               onSortingChange={list.onSortingChange}
               onEdit={handleEdit}
               onDelete={setDeleteId}
               canDelete={canDelete}
               isFetching={isPlaceholderData}
               emptyState={
                  list.isFiltered ? (
                     <NoResults />
                  ) : (
                     <NoRecords
                        action={
                           canCreate ? { label: t('roles.create'), to: '/roles/create' } : undefined
                        }
                     />
                  )
               }
            />
         )}

         <DeleteDialog
            open={deleteId !== null}
            onOpenChange={(open) => !open && setDeleteId(null)}
            onConfirm={() => {
               if (deleteId === null) return;
               deleteRole.mutate(
                  { id: deleteId },
                  {
                     onSuccess: () => toast.success(t('roles.toast.deleted')),
                     onSettled: () => setDeleteId(null),
                  },
               );
            }}
            isPending={deleteRole.isPending}
            title={t('roles.delete.title')}
            description={t('roles.delete.description')}
            confirmLabel={t('roles.delete.confirm')}
            cancelLabel={t('roles.delete.cancel')}
         />
      </div>
   );
};
