import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { NoRecords } from '@/components/common/NoRecords';
import { NoResults } from '@/components/common/NoResults';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { ReorderHints } from '@/components/common/ReorderHints';
import { SearchInput } from '@/components/common/SearchInput';
import { SkeletonListPage } from '@/components/common/SkeletonListPage';
import { Button } from '@/components/ui/button';
import { useListPageClamp } from '@/hooks/useListPageClamp';
import { useListReorder } from '@/hooks/useListReorder';
import { useListSearch } from '@/hooks/useListSearch';
import { usePermission } from '@/hooks/usePermission';

import { TagTable } from './TagTable';

const routeApi = getRouteApi('/_authenticated/tags');

export const TagListPage = () => {
   const { t } = useTranslation();
   const navigate = routeApi.useNavigate();
   const list = useListSearch(routeApi.useSearch(), (search, options) =>
      navigate({ to: '.', unsafeRelative: 'path', search, ...options }),
   );
   const [deleteId, setDeleteId] = useState<number | null>(null);

   const { data, isLoading, isPlaceholderData, isLoadingError, isFetching, refetch } = useQuery(
      api.tags.queries.all(list.listParams),
   );
   useListPageClamp(list, isPlaceholderData ? undefined : data?.totalCount);
   const tags = data?.data ?? [];
   const deleteTag = useMutation(api.tags.mutations.remove);
   const moveTag = useMutation(api.tags.mutations.move);
   const canCreate = usePermission('tags', 'create');
   const canUpdate = usePermission('tags', 'update');
   const canDelete = usePermission('tags', 'delete');

   const { canReorder, reorder } = useListReorder({
      itemCount: tags.length,
      sorting: list.sorting[0],
      isPlaceholderData,
      move: moveTag,
      canMove: canUpdate,
   });

   const handleEdit = useCallback(
      (id: number) => navigate({ to: '/tags/$tagId', params: { tagId: id }, search: true }),
      [navigate],
   );

   const handleCreate = () => {
      navigate({ to: '/tags/create', search: true });
   };

   const confirmDelete = () => {
      if (deleteId) {
         deleteTag.mutate(
            { id: deleteId },
            {
               onSuccess: () => {
                  setDeleteId(null);
                  toast.success(t('tags.toast.deleted'));
               },
            },
         );
      }
   };

   if (isLoading) {
      return <SkeletonListPage cols={8} reorder rowContent="actions" actions={['w-64', 'w-31']} />;
   }

   return (
      <div className="space-y-4">
         <PageHeader
            title={t('tags.title')}
            badge={reorder && <ReorderHints canReorder={canReorder} itemCount={tags.length} />}
            actions={
               <div className="flex flex-wrap items-center gap-3">
                  <SearchInput value={list.searchValue} onChange={list.onSearchChange} />
                  {canCreate && (
                     <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('tags.create')}
                     </Button>
                  )}
               </div>
            }
         />

         {isLoadingError ? (
            <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
         ) : (
            <TagTable
               data={tags}
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
                              ? { label: t('tags.create'), onClick: handleCreate }
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
            isPending={deleteTag.isPending}
            title={t('tags.delete.title')}
            description={t('tags.delete.description')}
            confirmLabel={t('tags.delete.confirm')}
            cancelLabel={t('tags.delete.cancel')}
         />
      </div>
   );
};
