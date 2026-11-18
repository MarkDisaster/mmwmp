import type { ColumnDef, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { RunnerScoreEntity } from '@/api/generated';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useServerTable } from '@/hooks/useServerTable';
import { formatDate } from '@/utils/date';

type RunnerScoreTableProps = {
   data: RunnerScoreEntity[];
   totalCount: number;
   pagination: PaginationState;
   onPaginationChange: OnChangeFn<PaginationState>;
   sorting: SortingState;
   onSortingChange: OnChangeFn<SortingState>;
   onToggleHidden?: (score: RunnerScoreEntity) => void;
   onDelete?: (id: number) => void;
   isFetching?: boolean;
   emptyState: ReactNode;
};

const formatDuration = (seconds: number) =>
   `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export const RunnerScoreTable = ({
   data,
   totalCount,
   pagination,
   onPaginationChange,
   sorting,
   onSortingChange,
   onToggleHidden,
   onDelete,
   isFetching,
   emptyState,
}: RunnerScoreTableProps) => {
   const { t, i18n } = useTranslation();

   const columns: ColumnDef<RunnerScoreEntity>[] = [
      {
         accessorKey: 'nick',
         header: t('runnerScores.table.nick'),
         cell: ({ row }) => <span className="font-semibold">{row.original.nick}</span>,
      },
      {
         accessorKey: 'score',
         header: t('runnerScores.table.score'),
         cell: ({ row }) => <span className="font-medium tabular-nums">{row.original.score}</span>,
      },
      {
         accessorKey: 'seconds',
         header: t('runnerScores.table.duration'),
         cell: ({ row }) => (
            <span className="text-muted-foreground tabular-nums">
               {formatDuration(row.original.seconds)}
            </span>
         ),
      },
      {
         id: 'hidden',
         accessorFn: (score) => score.hidden,
         header: t('runnerScores.table.visibility'),
         enableSorting: false,
         cell: ({ row }) => (
            <Badge variant={row.original.hidden ? 'secondary' : 'default'}>
               {row.original.hidden ? t('runnerScores.hidden') : t('runnerScores.visible')}
            </Badge>
         ),
      },
      {
         accessorKey: 'createdAt',
         header: t('runnerScores.table.createdAt'),
         cell: ({ row }) => formatDate(row.original.createdAt, i18n.language),
      },
      {
         id: 'actions',
         header: t('runnerScores.table.actions'),
         enableSorting: false,
         cell: ({ row }) => (
            <div className="flex gap-2" data-row-click="ignore">
               {onToggleHidden && (
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button
                           variant="ghost"
                           size="icon-sm"
                           aria-label={
                              row.original.hidden ? t('runnerScores.show') : t('runnerScores.hide')
                           }
                           onClick={() => onToggleHidden(row.original)}
                        >
                           {row.original.hidden ? (
                              <Eye className="h-4 w-4" />
                           ) : (
                              <EyeOff className="h-4 w-4" />
                           )}
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent>
                        {row.original.hidden ? t('runnerScores.show') : t('runnerScores.hide')}
                     </TooltipContent>
                  </Tooltip>
               )}
               {onDelete && (
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button
                           variant="ghost"
                           size="icon-sm"
                           aria-label={t('runnerScores.delete.title')}
                           onClick={() => onDelete(row.original.id)}
                        >
                           <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent>{t('runnerScores.delete.title')}</TooltipContent>
                  </Tooltip>
               )}
            </div>
         ),
      },
   ];

   const table = useServerTable({
      data,
      columns,
      totalCount,
      pagination,
      onPaginationChange,
      sorting,
      onSortingChange,
      enableSortingRemoval: false,
   });

   return <DataTable table={table} isFetching={isFetching} emptyState={emptyState} />;
};
