import type { ColumnDef, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { FileEntity } from '@/api/generated';
import { DataTable } from '@/components/common/DataTable';
import { LanguageBadge } from '@/components/common/LanguageBadge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileThumbnail } from '@/features/files/components/FileThumbnail';
import { useCopyFileUrl } from '@/features/files/hooks/useCopyFileUrl';
import { useServerTable } from '@/hooks/useServerTable';
import { formatDate } from '@/utils/date';
import { formatFileSize, getFileDisplayName } from '@/utils/file';
import { getAuthorLabel } from '@/utils/user';

type FileTableProps = {
   data: FileEntity[];
   totalCount: number;
   pagination: PaginationState;
   onPaginationChange: OnChangeFn<PaginationState>;
   sorting: SortingState;
   onSortingChange: OnChangeFn<SortingState>;
   onPreview: (file: FileEntity) => void;
   onEdit?: (file: FileEntity) => void;
   onDelete?: (file: FileEntity) => void;
   isFetching?: boolean;
   emptyState: ReactNode;
};

export const FileTable = ({
   data,
   totalCount,
   pagination,
   onPaginationChange,
   sorting,
   onSortingChange,
   onPreview,
   onEdit,
   onDelete,
   isFetching,
   emptyState,
}: FileTableProps) => {
   const { t, i18n } = useTranslation();

   const handleCopyUrl = useCopyFileUrl();

   const columns = useMemo<ColumnDef<FileEntity>[]>(
      () => [
         {
            accessorKey: 'publicUrl',
            header: t('files.table.preview'),
            cell: ({ row }) => (
               <button
                  type="button"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-muted"
                  onClick={() => onPreview(row.original)}
                  aria-label={t('files.table.preview')}
               >
                  <FileThumbnail
                     file={row.original}
                     className="h-full w-full"
                     iconClassName="h-5 w-5"
                  />
               </button>
            ),
            enableSorting: false,
         },
         {
            accessorKey: 'originalName',
            header: t('files.table.name'),
            cell: ({ row }) => (
               <span
                  className="block max-w-48 truncate font-medium"
                  title={getFileDisplayName(row.original)}
               >
                  {getFileDisplayName(row.original)}
               </span>
            ),
         },
         {
            accessorKey: 'size',
            header: t('files.table.size'),
            cell: ({ row }) => formatFileSize(row.original.size, i18n.language),
         },
         {
            id: 'dimensions',
            header: t('files.table.dimensions'),
            cell: ({ row }) =>
               row.original.width && row.original.height
                  ? `${row.original.width}\u00D7${row.original.height}`
                  : '\u2014',
            enableSorting: false,
         },
         {
            id: 'url',
            header: t('files.table.url'),
            cell: ({ row }) => (
               <span
                  className="block max-w-56 truncate text-xs text-muted-foreground"
                  title={row.original.publicUrl}
               >
                  {row.original.publicUrl}
               </span>
            ),
            enableSorting: false,
         },
         {
            id: 'createdBy',
            header: t('files.table.author'),
            cell: ({ row }) => (
               <span className="text-sm text-muted-foreground">
                  {getAuthorLabel(row.original.createdBy)}
               </span>
            ),
            enableSorting: false,
         },
         {
            id: 'language',
            header: t('files.table.language'),
            cell: ({ row }) =>
               row.original.language ? (
                  <LanguageBadge language={row.original.language} />
               ) : (
                  <span className="text-sm text-muted-foreground">—</span>
               ),
            enableSorting: false,
         },
         {
            accessorKey: 'createdAt',
            header: t('files.table.createdAt'),
            cell: ({ row }) => formatDate(row.original.createdAt, i18n.language),
         },
         {
            id: 'actions',
            header: t('files.table.actions'),
            cell: ({ row }) => (
               <div className="flex gap-1">
                  <Button
                     variant="ghost"
                     size="icon-sm"
                     onClick={() => handleCopyUrl(row.original.publicUrl)}
                     aria-label={t('files.table.copyUrl')}
                  >
                     <Copy className="h-4 w-4" />
                  </Button>
                  {onEdit && (
                     <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('common.edit')}
                        onClick={() => onEdit(row.original)}
                     >
                        <Pencil className="h-4 w-4" />
                     </Button>
                  )}
                  {onDelete && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t('files.delete.title')}
                              onClick={() => onDelete(row.original)}
                           >
                              <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('files.delete.title')}</TooltipContent>
                     </Tooltip>
                  )}
               </div>
            ),
            enableSorting: false,
         },
      ],
      [t, i18n.language, onPreview, onEdit, onDelete, handleCopyUrl],
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

   return <DataTable table={table} isFetching={isFetching} emptyState={emptyState} />;
};
