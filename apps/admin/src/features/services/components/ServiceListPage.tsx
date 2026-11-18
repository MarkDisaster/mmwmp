import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { ServiceEntityStatusEnumKey } from '@/api/generated';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { NoRecords } from '@/components/common/NoRecords';
import { NoResults } from '@/components/common/NoResults';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { ReorderHints } from '@/components/common/ReorderHints';
import { SearchInput } from '@/components/common/SearchInput';
import { SkeletonListPage } from '@/components/common/SkeletonListPage';
import { Button } from '@/components/ui/button';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { useListPageClamp } from '@/hooks/useListPageClamp';
import { useListReorder } from '@/hooks/useListReorder';
import { useListSearch } from '@/hooks/useListSearch';
import { usePermission } from '@/hooks/usePermission';
import { getPublishedRowLock } from '@/utils/reorder';

import { ServiceTable } from './ServiceTable';

const routeApi = getRouteApi('/_authenticated/services/');

export const ServiceListPage = () => {
   const { t } = useTranslation();
   const navigate = routeApi.useNavigate();
   const listSearch = routeApi.useSearch();
   const list = useListSearch(listSearch, (search, options) => navigate({ search, ...options }));
   const [deleteId, setDeleteId] = useState<number | null>(null);

   const { data, isLoading, isPlaceholderData, isLoadingError, isFetching, refetch } = useQuery(
      api.services.queries.all({ ...list.listParams, status: listSearch.status }),
   );
   useListPageClamp(list, isPlaceholderData ? undefined : data?.totalCount);
   const deleteService = useMutation(api.services.mutations.remove);
   const moveService = useMutation(api.services.mutations.move);
   const canCreate = usePermission('services', 'create');
   const canUpdate = usePermission('services', 'update');
   const canDelete = usePermission('services', 'delete');
   const canPublish = usePermission('services', 'publish');

   const handleEdit = (id: number) => {
      navigate({ to: '/services/$serviceId', params: { serviceId: id } });
   };

   const confirmDelete = () => {
      if (deleteId) {
         deleteService.mutate(
            { id: deleteId },
            {
               onSuccess: () => {
                  setDeleteId(null);
                  toast.success(t('services.toast.deleted'));
               },
               onError: () => toast.error(t('services.toast.deleteFailed')),
            },
         );
      }
   };

   const services = data?.data ?? [];

   const { canReorder, reorder } = useListReorder({
      itemCount: services.length,
      sorting: list.sorting[0],
      isPlaceholderData,
      move: moveService,
      canMove: canUpdate,
      isRowLocked: getPublishedRowLock(services, canPublish),
   });

   if (isLoading) {
      return (
         <SkeletonListPage
            cols={8}
            reorder
            rowContent="actions"
            actions={['w-31']}
            filters={['w-64', 'w-45']}
         />
      );
   }

   return (
      <div className="space-y-4">
         <PageHeader
            title={t('services.title')}
            badge={reorder && <ReorderHints canReorder={canReorder} itemCount={services.length} />}
            actions={
               canCreate && (
                  <Button asChild>
                     <Link to="/services/new">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('services.create')}
                     </Link>
                  </Button>
               )
            }
         />

         <div className="flex items-center gap-2">
            <SearchInput value={list.searchValue} onChange={list.onSearchChange} />
            <Select
               value={listSearch.status ?? 'all'}
               onValueChange={(v) =>
                  list.setFilters({
                     status: v === 'all' ? undefined : (v as ServiceEntityStatusEnumKey),
                  })
               }
            >
               <SelectTrigger className="w-45">
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">{t('services.status.all')}</SelectItem>
                  <SelectItem value="draft">{t('services.status.draft')}</SelectItem>
                  <SelectItem value="published">{t('services.status.published')}</SelectItem>
               </SelectContent>
            </Select>
         </div>

         {isLoadingError ? (
            <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
         ) : (
            <ServiceTable
               data={services}
               totalCount={data?.totalCount ?? 0}
               pagination={list.pagination}
               onPaginationChange={list.onPaginationChange}
               sorting={list.sorting}
               onSortingChange={list.onSortingChange}
               onEdit={handleEdit}
               onDelete={canDelete ? setDeleteId : undefined}
               reorder={reorder}
               isFetching={isPlaceholderData}
               emptyState={
                  list.isFiltered ? (
                     <NoResults />
                  ) : (
                     <NoRecords
                        action={
                           canCreate
                              ? { label: t('services.create'), to: '/services/new' }
                              : undefined
                        }
                     />
                  )
               }
            />
         )}

         <DeleteDialog
            open={deleteId !== null}
            onOpenChange={(open) => !open && setDeleteId(null)}
            onConfirm={confirmDelete}
            isPending={deleteService.isPending}
            title={t('services.delete.title')}
            description={t('services.delete.description')}
            confirmLabel={t('services.delete.confirm')}
            cancelLabel={t('services.delete.cancel')}
         />
      </div>
   );
};
