import { cn } from '@mm/utils/cn';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { ProjectEntityStatusEnumKey } from '@/api/generated';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { GridPagination } from '@/components/common/GridPagination';
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
import { ViewToggle } from '@/features/layout/components/ViewToggle';
import { useListPageClamp } from '@/hooks/useListPageClamp';
import { useListReorder } from '@/hooks/useListReorder';
import { useListSearch } from '@/hooks/useListSearch';
import { usePermission } from '@/hooks/usePermission';
import { useViewMode } from '@/store/viewModeStore';
import { getPublishedRowLock } from '@/utils/reorder';

import { ProjectCardGrid } from './ProjectCardGrid';
import { ProjectTable } from './ProjectTable';

const routeApi = getRouteApi('/_authenticated/projects/');

export const ProjectListPage = () => {
   const { t } = useTranslation();
   const navigate = routeApi.useNavigate();
   const listSearch = routeApi.useSearch();
   const list = useListSearch(listSearch, (search, options) => navigate({ search, ...options }));
   const [deleteId, setDeleteId] = useState<number | null>(null);
   const [viewMode, setViewMode] = useViewMode('projects', 'table');

   const { data, isLoading, isPlaceholderData, isLoadingError, isFetching, refetch } = useQuery(
      api.projects.queries.all({ ...list.listParams, status: listSearch.status }),
   );
   useListPageClamp(list, isPlaceholderData ? undefined : data?.totalCount);
   const projects = data?.data ?? [];
   const totalCount = data?.totalCount ?? 0;
   const deleteProject = useMutation(api.projects.mutations.remove);
   const moveProject = useMutation(api.projects.mutations.move);
   const canCreate = usePermission('projects', 'create');
   const canUpdate = usePermission('projects', 'update');
   const canDelete = usePermission('projects', 'delete');
   const canPublish = usePermission('projects', 'publish');

   const { canReorder, reorder } = useListReorder({
      itemCount: projects.length,
      sorting: list.sorting[0],
      isPlaceholderData,
      move: moveProject,
      canMove: canUpdate,
      isRowLocked: getPublishedRowLock(projects, canPublish),
   });

   const handleEdit = (id: number) => {
      navigate({ to: '/projects/$projectId', params: { projectId: id } });
   };

   const confirmDelete = () => {
      if (deleteId) {
         deleteProject.mutate(
            { id: deleteId },
            {
               onSuccess: () => {
                  setDeleteId(null);
                  toast.success(t('projects.toast.deleted'));
               },
               onError: () => toast.error(t('projects.toast.deleteFailed')),
            },
         );
      }
   };

   const emptyState = list.isFiltered ? (
      <NoResults />
   ) : (
      <NoRecords
         action={canCreate ? { label: t('projects.create'), to: '/projects/create' } : undefined}
      />
   );

   if (isLoading) {
      const filters = ['w-64', 'w-45'];
      const actions = ['h-9.5 w-17.5', 'w-33'];
      return viewMode === 'grid' ? (
         <SkeletonListPage variant="grid" card="project" actions={actions} filters={filters} />
      ) : (
         <SkeletonListPage
            cols={10}
            reorder
            rowContent="actions"
            actions={actions}
            filters={filters}
         />
      );
   }

   return (
      <div className="space-y-4">
         <PageHeader
            title={t('projects.title')}
            badge={
               reorder && (
                  <ReorderHints canReorder={canReorder} itemCount={projects.length} withCards />
               )
            }
            actions={
               <div className="flex flex-wrap items-center gap-2">
                  <ViewToggle value={viewMode} onChange={setViewMode} />
                  {canCreate && (
                     <Button asChild>
                        <Link to="/projects/create">
                           <Plus className="mr-2 h-4 w-4" />
                           {t('projects.create')}
                        </Link>
                     </Button>
                  )}
               </div>
            }
         />

         <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={list.searchValue} onChange={list.onSearchChange} />
            <Select
               value={listSearch.status ?? 'all'}
               onValueChange={(v) =>
                  list.setFilters({
                     status: v === 'all' ? undefined : (v as ProjectEntityStatusEnumKey),
                  })
               }
            >
               <SelectTrigger className="w-45">
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">{t('projects.status.all')}</SelectItem>
                  <SelectItem value="draft">{t('projects.status.draft')}</SelectItem>
                  <SelectItem value="published">{t('projects.status.published')}</SelectItem>
               </SelectContent>
            </Select>
         </div>

         {isLoadingError && (
            <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
         )}

         {!isLoadingError && viewMode === 'grid' && (
            <div
               className={cn(
                  'transition-opacity',
                  isPlaceholderData && 'pointer-events-none opacity-50',
               )}
            >
               {projects.length === 0 ? (
                  <div className="py-8">{emptyState}</div>
               ) : (
                  <ProjectCardGrid projects={projects} reorder={reorder} />
               )}
               <GridPagination
                  pagination={list.pagination}
                  onPaginationChange={list.onPaginationChange}
                  totalCount={totalCount}
               />
            </div>
         )}

         {!isLoadingError && viewMode === 'table' && (
            <ProjectTable
               data={projects}
               totalCount={totalCount}
               pagination={list.pagination}
               onPaginationChange={list.onPaginationChange}
               sorting={list.sorting}
               onSortingChange={list.onSortingChange}
               onEdit={handleEdit}
               onDelete={canDelete ? setDeleteId : undefined}
               reorder={reorder}
               isFetching={isPlaceholderData}
               emptyState={emptyState}
            />
         )}

         <DeleteDialog
            open={deleteId !== null}
            onOpenChange={(open) => !open && setDeleteId(null)}
            onConfirm={confirmDelete}
            isPending={deleteProject.isPending}
            title={t('projects.delete.title')}
            description={t('projects.delete.description')}
            confirmLabel={t('projects.delete.confirm')}
            cancelLabel={t('projects.delete.cancel')}
         />
      </div>
   );
};
