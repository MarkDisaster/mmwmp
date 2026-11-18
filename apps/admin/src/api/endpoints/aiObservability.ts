import { queryOptions } from '@tanstack/react-query';

import type { AiObservabilityControllerSummaryQueryParams } from '@/api/generated';
import { aiObservabilityControllerSummary } from '@/api/generated';
import type { ApiDefinitionObject, QueryKeysObject } from '@/api/types';

const queryKeys = {
   summary: (params: AiObservabilityControllerSummaryQueryParams) =>
      ['aiObservability', 'summary', params] as const,
} satisfies QueryKeysObject;

export const aiObservability = {
   queries: {
      summary: (params: AiObservabilityControllerSummaryQueryParams = {}) =>
         queryOptions({
            queryKey: queryKeys.summary(params),
            queryFn: () => aiObservabilityControllerSummary(params).then((r) => r.data),
            retry: false,
         }),
   },
} satisfies ApiDefinitionObject;
