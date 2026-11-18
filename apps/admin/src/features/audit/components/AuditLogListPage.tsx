import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import type { AuditControllerFindAllQueryParams } from '@/api/generated';
import { NoRecords } from '@/components/common/NoRecords';
import { NoResults } from '@/components/common/NoResults';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { SkeletonListPage } from '@/components/common/SkeletonListPage';
import { Input } from '@/components/ui/input';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { ACTOR_TYPES, RESOURCE_TYPES } from '@/features/audit/constants';
import { useDebouncedParam } from '@/hooks/useDebouncedParam';
import { useListPageClamp } from '@/hooks/useListPageClamp';
import { useListSearch } from '@/hooks/useListSearch';

import { AuditLogTable } from './AuditLogTable';

const routeApi = getRouteApi('/_authenticated/audit/');

export const AuditLogListPage = () => {
   const { t } = useTranslation();
   const navigate = routeApi.useNavigate();
   const listSearch = routeApi.useSearch();
   const list = useListSearch(listSearch, (search, options) => navigate({ search, ...options }));
   const [actionValue, onActionChange] = useDebouncedParam(listSearch.action, (action) =>
      list.setFilters({ action }, { replace: true }),
   );

   const { data, isLoading, isPlaceholderData, isLoadingError, isFetching, refetch } = useQuery(
      api.auditLogs.queries.all({
         page: list.pagination.pageIndex,
         limit: list.pagination.pageSize,
         action: listSearch.action || undefined,
         resourceType: listSearch.resourceType,
         actorType: listSearch.actorType,
         from: listSearch.from,
         to: listSearch.to,
      }),
   );
   useListPageClamp(list, isPlaceholderData ? undefined : data?.totalCount);

   if (isLoading) {
      return <SkeletonListPage cols={5} filters={['w-48', 'w-44', 'w-40', 'w-40', 'w-40']} />;
   }

   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">{t('auditLog.title')}</h1>
         </div>

         <div className="flex flex-wrap gap-3">
            <Input
               value={actionValue}
               onChange={(e) => onActionChange(e.target.value)}
               placeholder={t('auditLog.filters.action')}
               aria-label={t('auditLog.filters.action')}
               className="w-48"
            />

            <Select
               value={listSearch.resourceType ?? 'all'}
               onValueChange={(v) =>
                  list.setFilters({
                     resourceType: v === 'all' ? undefined : (v as (typeof RESOURCE_TYPES)[number]),
                  })
               }
            >
               <SelectTrigger className="w-44" aria-label={t('auditLog.filters.resourceType')}>
                  <SelectValue placeholder={t('auditLog.filters.resourceType')} />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">{t('auditLog.filters.all')}</SelectItem>
                  {RESOURCE_TYPES.map((rt) => (
                     <SelectItem key={rt} value={rt}>
                        {rt}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>

            <Select
               value={listSearch.actorType ?? 'all'}
               onValueChange={(v) =>
                  list.setFilters({
                     actorType:
                        v === 'all'
                           ? undefined
                           : (v as AuditControllerFindAllQueryParams['actorType']),
                  })
               }
            >
               <SelectTrigger className="w-40" aria-label={t('auditLog.filters.actorType')}>
                  <SelectValue placeholder={t('auditLog.filters.actorType')} />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">{t('auditLog.filters.all')}</SelectItem>
                  {ACTOR_TYPES.map((at) => (
                     <SelectItem key={at} value={at}>
                        {t(`auditLog.actorType.${at}`)}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
               <Input
                  type="date"
                  value={listSearch.from ?? ''}
                  onChange={(e) => list.setFilters({ from: e.target.value || undefined })}
                  className="w-40"
                  aria-label={t('auditLog.filters.from')}
               />
               <span className="text-sm text-muted-foreground" aria-hidden="true">
                  —
               </span>
               <Input
                  type="date"
                  value={listSearch.to ?? ''}
                  onChange={(e) => list.setFilters({ to: e.target.value || undefined })}
                  className="w-40"
                  aria-label={t('auditLog.filters.to')}
               />
            </div>
         </div>

         {isLoadingError ? (
            <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
         ) : (
            <AuditLogTable
               data={data?.data ?? []}
               totalCount={data?.totalCount ?? 0}
               pagination={list.pagination}
               onPaginationChange={list.onPaginationChange}
               isFetching={isPlaceholderData}
               emptyState={list.isFiltered ? <NoResults /> : <NoRecords />}
            />
         )}
      </div>
   );
};
