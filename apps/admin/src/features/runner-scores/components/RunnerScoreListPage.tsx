import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { RunnerScoreEntity } from '@/api/generated';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { NoRecords } from '@/components/common/NoRecords';
import { NoResults } from '@/components/common/NoResults';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { SearchInput } from '@/components/common/SearchInput';
import { SkeletonListPage } from '@/components/common/SkeletonListPage';
import { useListPageClamp } from '@/hooks/useListPageClamp';
import { useListSearch } from '@/hooks/useListSearch';
import { usePermission } from '@/hooks/usePermission';

import { RunnerScoreTable } from './RunnerScoreTable';

const routeApi = getRouteApi('/_authenticated/runner-scores/');

export const RunnerScoreListPage = () => {
   const { t } = useTranslation();
   const navigate = routeApi.useNavigate();
   const list = useListSearch(routeApi.useSearch(), (search, options) =>
      navigate({ search, ...options }),
   );
   const [deleteId, setDeleteId] = useState<number | null>(null);

   const { data, isLoading, isPlaceholderData, isLoadingError, isFetching, refetch } = useQuery(
      api.runnerScores.queries.all(list.listParams),
   );
   useListPageClamp(list, isPlaceholderData ? undefined : data?.totalCount);
   const updateVisibility = useMutation(api.runnerScores.mutations.updateVisibility);
   const deleteScore = useMutation(api.runnerScores.mutations.remove);
   const canUpdate = usePermission('runner_scores', 'update');
   const canDelete = usePermission('runner_scores', 'delete');

   const toggleHidden = (score: RunnerScoreEntity) => {
      updateVisibility.mutate(
         { id: score.id, data: { hidden: !score.hidden } },
         {
            onSuccess: (updated) =>
               toast.success(
                  updated.hidden ? t('runnerScores.toast.hidden') : t('runnerScores.toast.shown'),
               ),
         },
      );
   };

   const confirmDelete = () => {
      if (deleteId) {
         deleteScore.mutate(
            { id: deleteId },
            {
               onSuccess: () => {
                  setDeleteId(null);
                  toast.success(t('runnerScores.toast.deleted'));
               },
            },
         );
      }
   };

   if (isLoading) return <SkeletonListPage cols={6} rowContent="actions" actions={['w-64']} />;

   return (
      <div className="space-y-4">
         <PageHeader
            title={t('runnerScores.title')}
            actions={<SearchInput value={list.searchValue} onChange={list.onSearchChange} />}
         />

         {isLoadingError ? (
            <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
         ) : (
            <RunnerScoreTable
               data={data?.data ?? []}
               totalCount={data?.totalCount ?? 0}
               pagination={list.pagination}
               onPaginationChange={list.onPaginationChange}
               sorting={list.sorting}
               onSortingChange={list.onSortingChange}
               onToggleHidden={canUpdate ? toggleHidden : undefined}
               onDelete={canDelete ? setDeleteId : undefined}
               isFetching={isPlaceholderData}
               emptyState={list.isFiltered ? <NoResults /> : <NoRecords />}
            />
         )}

         <DeleteDialog
            open={deleteId !== null}
            onOpenChange={(open) => !open && setDeleteId(null)}
            onConfirm={confirmDelete}
            isPending={deleteScore.isPending}
            title={t('runnerScores.delete.title')}
            description={t('runnerScores.delete.description')}
            confirmLabel={t('runnerScores.delete.confirm')}
            cancelLabel={t('runnerScores.delete.cancel')}
         />
      </div>
   );
};
