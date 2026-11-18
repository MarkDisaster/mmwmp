import { cn } from '@mm/utils/cn';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { FileEntity } from '@/api/generated';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { GridPagination } from '@/components/common/GridPagination';
import { NoRecords } from '@/components/common/NoRecords';
import { NoResults } from '@/components/common/NoResults';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { SearchInput } from '@/components/common/SearchInput';
import { SkeletonListPage } from '@/components/common/SkeletonListPage';
import { Button } from '@/components/ui/button';
import { FileCard } from '@/features/files/components/FileCard';
import { FileDetailDialog } from '@/features/files/components/FileDetailDialog';
import { FileTable } from '@/features/files/components/FileTable';
import { CardGrid } from '@/features/layout/components/CardGrid';
import { ViewToggle } from '@/features/layout/components/ViewToggle';
import { useListPageClamp } from '@/hooks/useListPageClamp';
import { useListSearch } from '@/hooks/useListSearch';
import { usePermission } from '@/hooks/usePermission';
import { useViewMode } from '@/store/viewModeStore';
import { isFileProcessing } from '@/utils/file';

const routeApi = getRouteApi('/_authenticated/files');

export const FileListPage = () => {
   const { t } = useTranslation();
   const navigate = routeApi.useNavigate();
   const list = useListSearch(routeApi.useSearch(), (search, options) =>
      navigate({ to: '.', unsafeRelative: 'path', search, ...options }),
   );
   const [deleteTarget, setDeleteTarget] = useState<FileEntity | null>(null);
   const [detailTarget, setDetailTarget] = useState<FileEntity | null>(null);
   const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view');
   const [viewMode, setViewMode] = useViewMode('files', 'grid');

   const { data, isLoading, isPlaceholderData, isLoadingError, isFetching, refetch } = useQuery({
      ...api.files.queries.all(list.listParams),
      refetchInterval: (query) => (query.state.data?.data?.some(isFileProcessing) ? 3000 : false),
   });
   useListPageClamp(list, isPlaceholderData ? undefined : data?.totalCount);
   const deleteFile = useMutation(api.files.mutations.remove);
   const canUpload = usePermission('files', 'create');
   const canEdit = usePermission('files', 'update');
   const canDelete = usePermission('files', 'delete');

   const files = data?.data ?? [];
   const totalCount = data?.totalCount ?? 0;

   if (isLoading) {
      const actions = ['w-64', 'h-9.5 w-17.5', 'w-35'];
      return viewMode === 'grid' ? (
         <SkeletonListPage variant="grid" card="file" actions={actions} />
      ) : (
         <SkeletonListPage cols={9} rowContent="thumbnail" actions={actions} />
      );
   }

   const emptyState = list.isFiltered ? (
      <NoResults />
   ) : (
      <NoRecords
         action={canUpload ? { label: t('files.upload'), to: '/files/upload' } : undefined}
      />
   );

   const detailFile = files.find((file) => file.id === detailTarget?.id) ?? detailTarget;

   const openDetail = (file: FileEntity, mode: 'view' | 'edit') => {
      setDetailTarget(file);
      setDetailMode(mode);
   };
   const handleEdit = canEdit ? (file: FileEntity) => openDetail(file, 'edit') : undefined;
   const handleDeleteRequest = canDelete ? setDeleteTarget : undefined;

   const handleDelete = () => {
      if (!deleteTarget) return;
      deleteFile.mutate(
         { id: deleteTarget.id },
         {
            onSuccess: () => {
               toast.success(t('files.toast.deleted'));
               setDeleteTarget(null);
            },
         },
      );
   };

   return (
      <div className="space-y-4">
         <PageHeader
            title={t('files.title')}
            actions={
               <div className="flex flex-wrap items-center gap-3">
                  <SearchInput value={list.searchValue} onChange={list.onSearchChange} />
                  <ViewToggle value={viewMode} onChange={setViewMode} />
                  {canUpload && (
                     <Button asChild>
                        <Link to="/files/upload" search>
                           <Plus className="mr-2 h-4 w-4" />
                           {t('files.upload')}
                        </Link>
                     </Button>
                  )}
               </div>
            }
         />

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
               {files.length === 0 ? (
                  <div className="py-8">{emptyState}</div>
               ) : (
                  <CardGrid>
                     {files.map((file) => (
                        <FileCard
                           key={file.id}
                           file={file}
                           onPreview={(f) => openDetail(f, 'view')}
                           onEdit={handleEdit}
                           onDelete={handleDeleteRequest}
                        />
                     ))}
                  </CardGrid>
               )}
               <GridPagination
                  pagination={list.pagination}
                  onPaginationChange={list.onPaginationChange}
                  totalCount={totalCount}
               />
            </div>
         )}

         {!isLoadingError && viewMode === 'table' && (
            <FileTable
               data={files}
               totalCount={totalCount}
               pagination={list.pagination}
               onPaginationChange={list.onPaginationChange}
               sorting={list.sorting}
               onSortingChange={list.onSortingChange}
               onPreview={(f) => openDetail(f, 'view')}
               onEdit={handleEdit}
               onDelete={handleDeleteRequest}
               isFetching={isPlaceholderData}
               emptyState={emptyState}
            />
         )}

         <DeleteDialog
            open={deleteTarget !== null}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            onConfirm={handleDelete}
            isPending={deleteFile.isPending}
            title={t('files.delete.title')}
            description={t('files.delete.description', { name: deleteTarget?.originalName ?? '' })}
            confirmLabel={t('files.delete.confirm')}
            cancelLabel={t('files.delete.cancel')}
         />

         <FileDetailDialog
            open={detailFile !== null}
            onOpenChange={(open) => !open && setDetailTarget(null)}
            file={detailFile}
            initialMode={detailMode}
            canEdit={canEdit}
            onDelete={handleDeleteRequest}
            onSaved={setDetailTarget}
         />
      </div>
   );
};
