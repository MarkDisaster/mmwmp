import { cn } from '@mm/utils/cn';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { Tabs } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import { TRASH_TYPES, type TrashType } from '@/api/endpoints/trash';
import type { TrashedItemEntity } from '@/api/generated';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { NoResults } from '@/components/common/NoResults';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { SearchInput } from '@/components/common/SearchInput';
import { SkeletonListPage } from '@/components/common/SkeletonListPage';
import { useListPageClamp } from '@/hooks/useListPageClamp';
import { useListSearch } from '@/hooks/useListSearch';
import { usePermission } from '@/hooks/usePermission';
import { getHttpStatus } from '@/utils/httpError';

import { TrashTable } from './TrashTable';

const routeApi = getRouteApi('/_authenticated/trash/');

type Pending = { type: TrashType; item: TrashedItemEntity };

const RESTORE_DESCRIPTION_KEYS = {
   projects: 'trash.restoreDescription',
   services: 'trash.restoreDescription',
   tags: 'trash.restoreDescriptionTag',
   files: 'trash.restoreDescriptionFile',
} as const satisfies Record<TrashType, string>;

export const TrashPage = () => {
   const { t } = useTranslation();
   const navigate = routeApi.useNavigate();
   const search = routeApi.useSearch();
   const list = useListSearch(search, (next, options) => navigate({ search: next, ...options }));
   const [restoring, setRestoring] = useState<Pending | null>(null);
   const [deleting, setDeleting] = useState<Pending | null>(null);

   const canDelete = {
      projects: usePermission('projects', 'delete'),
      services: usePermission('services', 'delete'),
      tags: usePermission('tags', 'delete'),
      files: usePermission('files', 'delete'),
   } satisfies Record<TrashType, boolean>;
   const tabs = TRASH_TYPES.filter((type) => canDelete[type]);
   const tab = search.tab && tabs.includes(search.tab) ? search.tab : tabs[0];

   const { data, isLoading, isPlaceholderData, isLoadingError, isFetching, refetch } = useQuery({
      ...api.trash.queries.list(tab ?? 'projects', list.listParams),
      enabled: !!tab,
   });
   useListPageClamp(list, isPlaceholderData ? undefined : data?.totalCount);
   const restore = useMutation(api.trash.mutations.restore);
   const removePermanently = useMutation(api.trash.mutations.removePermanently);

   const confirmRestore = () => {
      if (!restoring) return;
      restore.mutate(
         { type: restoring.type, id: restoring.item.id },
         {
            onSuccess: () => {
               setRestoring(null);
               toast.success(t('trash.toast.restored'));
            },
            onError: (error) => {
               setRestoring(null);
               toast.error(
                  getHttpStatus(error) === 409
                     ? t('trash.toast.restoreConflict')
                     : t('trash.toast.restoreFailed'),
               );
            },
         },
      );
   };

   const confirmDelete = () => {
      if (!deleting) return;
      removePermanently.mutate(
         { type: deleting.type, id: deleting.item.id },
         {
            onSuccess: () => {
               setDeleting(null);
               toast.success(t('trash.toast.deleted'));
            },
            onError: (error) => {
               setDeleting(null);
               toast.error(
                  getHttpStatus(error) === 409
                     ? t('trash.toast.deleteInUse')
                     : t('trash.toast.deleteFailed'),
               );
            },
         },
      );
   };

   if (!tab) return null;
   if (isLoading) return <SkeletonListPage cols={5} rowContent="actions" actions={['w-64']} />;

   return (
      <div className="space-y-4">
         <PageHeader
            title={t('trash.title')}
            actions={<SearchInput value={list.searchValue} onChange={list.onSearchChange} />}
         />
         <p className="text-sm text-muted-foreground">{t('trash.description')}</p>

         <Tabs.Root
            value={tab}
            onValueChange={(next) => list.setFilters({ tab: next as TrashType })}
         >
            <Tabs.List
               className="mb-4 flex gap-1 border-b border-border"
               aria-label={t('trash.title')}
            >
               {tabs.map((type) => (
                  <Tabs.Trigger
                     key={type}
                     value={type}
                     className={cn(
                        '-mb-px border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors',
                        'hover:text-link-hover focus-visible:outline-2 focus-visible:outline-ring',
                        'data-[state=active]:border-primary data-[state=active]:text-primary',
                     )}
                  >
                     {t(`trash.tabs.${type}`)}
                  </Tabs.Trigger>
               ))}
            </Tabs.List>

            <Tabs.Content value={tab} className="focus-visible:outline-none">
               {isLoadingError ? (
                  <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
               ) : (
                  <TrashTable
                     data={data?.data ?? []}
                     totalCount={data?.totalCount ?? 0}
                     pagination={list.pagination}
                     onPaginationChange={list.onPaginationChange}
                     sorting={list.sorting}
                     onSortingChange={list.onSortingChange}
                     onRestore={(item) => setRestoring({ type: tab, item })}
                     onDeletePermanently={(item) => setDeleting({ type: tab, item })}
                     isFetching={isPlaceholderData}
                     emptyState={
                        list.isFiltered ? (
                           <NoResults />
                        ) : (
                           <div className="text-center">
                              <p className="text-sm font-medium">{t('trash.empty')}</p>
                              <p className="text-sm text-muted-foreground">
                                 {t('trash.emptyDescription')}
                              </p>
                           </div>
                        )
                     }
                  />
               )}
            </Tabs.Content>
         </Tabs.Root>

         <ConfirmDialog
            open={restoring !== null}
            onOpenChange={(open) => !open && setRestoring(null)}
            onConfirm={confirmRestore}
            isPending={restore.isPending}
            title={t('trash.restoreTitle', { name: restoring?.item.title })}
            description={t(RESTORE_DESCRIPTION_KEYS[restoring?.type ?? 'projects'])}
            confirmLabel={t('trash.restoreConfirm')}
            cancelLabel={t('trash.cancel')}
         />
         <DeleteDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            onConfirm={confirmDelete}
            isPending={removePermanently.isPending}
            title={t('trash.deleteTitle', { name: deleting?.item.title })}
            description={t('trash.deleteDescription')}
            confirmLabel={t('trash.deleteConfirm')}
            cancelLabel={t('trash.cancel')}
         />
      </div>
   );
};
