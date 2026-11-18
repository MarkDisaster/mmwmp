import type { ColumnDef, OnChangeFn, PaginationState } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AuditLogEntity } from '@/api/generated';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { useServerTable } from '@/hooks/useServerTable';
import { formatDateTime } from '@/utils/date';
import { getAuthorLabel } from '@/utils/user';

type AuditLogTableProps = {
   data: AuditLogEntity[];
   totalCount: number;
   pagination: PaginationState;
   onPaginationChange: OnChangeFn<PaginationState>;
   isFetching?: boolean;
   emptyState: ReactNode;
};

const MetadataCell = ({ metadata }: { metadata: unknown }) => {
   const [expanded, setExpanded] = useState(false);
   const detailId = useId();

   if (metadata === null || metadata === undefined) {
      return <span className="text-muted-foreground">—</span>;
   }

   return (
      <div className="max-w-xs">
         <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailId}
            className="block max-w-full cursor-pointer truncate text-left text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
         >
            {JSON.stringify(metadata).slice(0, 60)}
         </button>
         <pre
            id={detailId}
            hidden={!expanded}
            className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs"
         >
            {JSON.stringify(metadata, null, 2)}
         </pre>
      </div>
   );
};

const actorTypeBadgeVariant = (
   actorType: AuditLogEntity['actorType'],
   isAdmin?: boolean,
): 'default' | 'secondary' | 'outline' | 'destructive' => {
   if (actorType === 'ai') return 'secondary';
   if (actorType === 'system') return 'outline';
   if (isAdmin) return 'destructive';
   return 'default';
};

export const AuditLogTable = ({
   data,
   totalCount,
   pagination,
   onPaginationChange,
   isFetching,
   emptyState,
}: AuditLogTableProps) => {
   const { t, i18n } = useTranslation();

   const columns: ColumnDef<AuditLogEntity>[] = [
      {
         accessorKey: 'createdAt',
         header: t('auditLog.table.date'),
         cell: ({ row }) => (
            <time
               dateTime={row.original.createdAt}
               className="text-sm whitespace-nowrap text-muted-foreground"
            >
               {formatDateTime(row.original.createdAt, i18n.language)}
            </time>
         ),
         enableSorting: false,
      },
      {
         id: 'actor',
         header: t('auditLog.table.actor'),
         enableSorting: false,
         cell: ({ row }) => (
            <div className="flex flex-col gap-0.5">
               <span className="text-sm font-medium">{getAuthorLabel(row.original.user)}</span>
               <Badge
                  variant={actorTypeBadgeVariant(
                     row.original.actorType,
                     row.original.user?.role?.isAdmin,
                  )}
                  className="w-fit text-xs"
               >
                  {row.original.user?.role?.isAdmin
                     ? t('auditLog.actorType.admin')
                     : t(`auditLog.actorType.${row.original.actorType}`)}
               </Badge>
            </div>
         ),
      },
      {
         accessorKey: 'action',
         header: t('auditLog.table.action'),
         enableSorting: false,
         cell: ({ row }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.original.action}</code>
         ),
      },
      {
         id: 'resource',
         header: t('auditLog.table.resource'),
         enableSorting: false,
         cell: ({ row }) => {
            const resourceName = row.original.metadata?.resourceName;
            return (
               <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{row.original.resourceType}</span>
                  {resourceName && (
                     <span className="max-w-32 truncate text-xs font-medium">{resourceName}</span>
                  )}
                  {row.original.resourceId && (
                     <span className="text-xs text-muted-foreground">
                        #{row.original.resourceId}
                     </span>
                  )}
               </div>
            );
         },
      },
      {
         accessorKey: 'metadata',
         header: t('auditLog.table.metadata'),
         enableSorting: false,
         cell: ({ row }) => <MetadataCell metadata={row.original.metadata} />,
      },
   ];

   const table = useServerTable({
      data,
      columns,
      totalCount,
      pagination,
      onPaginationChange,
   });

   return <DataTable table={table} isFetching={isFetching} emptyState={emptyState} />;
};
