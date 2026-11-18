import { keepPreviousData, mutationOptions, queryOptions } from '@tanstack/react-query';

import type {
   RunnerScoreControllerFindAllQueryParams,
   UpdateRunnerScoreVisibilityDto,
} from '@/api/generated';
import {
   runnerScoreControllerFindAll,
   runnerScoreControllerRemove,
   runnerScoreControllerUpdateVisibility,
} from '@/api/generated';
import type { ApiDefinitionObject, MutationKeysObject, QueryKeysObject } from '@/api/types';
import { queryClient } from '@/utils/query-client';

const all = ['runnerScores'] as const;

export const queryKeys = {
   all,
   lists: () => [...all, 'list'] as const,
   list: (params?: RunnerScoreControllerFindAllQueryParams) => [...all, 'list', params] as const,
} satisfies QueryKeysObject;

const mutationKeys = {
   updateVisibility: ['runnerScores', 'updateVisibility'] as const,
   remove: ['runnerScores', 'remove'] as const,
} satisfies MutationKeysObject;

export const runnerScores = {
   queries: {
      all: (params?: RunnerScoreControllerFindAllQueryParams) =>
         queryOptions({
            queryKey: queryKeys.list(params),
            queryFn: () => runnerScoreControllerFindAll(params).then((r) => r.data),
            placeholderData: keepPreviousData,
         }),
   },
   mutations: {
      updateVisibility: mutationOptions({
         mutationKey: mutationKeys.updateVisibility,
         meta: { errorMessage: 'common.error' },
         mutationFn: ({ id, data }: { id: number; data: UpdateRunnerScoreVisibilityDto }) =>
            runnerScoreControllerUpdateVisibility(id, data).then((r) => r.data),
         onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      }),
      remove: mutationOptions({
         mutationKey: mutationKeys.remove,
         meta: { errorMessage: 'common.error' },
         mutationFn: ({ id }: { id: number }) =>
            runnerScoreControllerRemove(id).then((r) => r.data),
         onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      }),
   },
} satisfies ApiDefinitionObject;
