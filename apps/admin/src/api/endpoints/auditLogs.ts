import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { AuditControllerFindAllQueryParams } from '@/api/generated';
import { auditControllerFindAll } from '@/api/generated';
import type { ApiDefinitionObject, QueryKeysObject } from '@/api/types';

const all = ['auditLogs'] as const;

const queryKeys = {
   all,
   lists: () => [...all, 'list'] as const,
   list: (params?: AuditControllerFindAllQueryParams) => [...all, 'list', params] as const,
} satisfies QueryKeysObject;

export const auditLogs = {
   queries: {
      all: (params?: AuditControllerFindAllQueryParams) =>
         queryOptions({
            queryKey: queryKeys.list(params),
            queryFn: () => auditControllerFindAll(params).then((r) => r.data),
            placeholderData: keepPreviousData,
         }),
   },
} satisfies ApiDefinitionObject;
