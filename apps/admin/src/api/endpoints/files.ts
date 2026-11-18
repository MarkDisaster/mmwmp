import { keepPreviousData, mutationOptions, queryOptions } from '@tanstack/react-query';

import type { FileControllerFindAllQueryParams, UpdateFileDto } from '@/api/generated';
import {
   fileControllerFindAll,
   fileControllerFindOne,
   fileControllerRemove,
   fileControllerUpdate,
} from '@/api/generated';
import { trashQueryKeys } from '@/api/trashKeys';
import type { ApiDefinitionObject, MutationKeysObject, QueryKeysObject } from '@/api/types';
import { queryClient } from '@/utils/query-client';

const all = ['files'] as const;

export const queryKeys = {
   all,
   lists: () => [...all, 'list'] as const,
   list: (params?: FileControllerFindAllQueryParams) => [...all, 'list', params] as const,
   details: () => [...all, 'detail'] as const,
   detail: (id: number) => [...all, 'detail', id] as const,
} satisfies QueryKeysObject;

const mutationKeys = {
   update: ['files', 'update'] as const,
   remove: ['files', 'remove'] as const,
} satisfies MutationKeysObject;

export const files = {
   queries: {
      detail: (id: number) =>
         queryOptions({
            queryKey: queryKeys.detail(id),
            queryFn: () => fileControllerFindOne(id).then((r) => r.data),
         }),
      all: (params?: FileControllerFindAllQueryParams) =>
         queryOptions({
            queryKey: queryKeys.list(params),
            queryFn: () => fileControllerFindAll(params).then((r) => r.data),
            placeholderData: keepPreviousData,
         }),
   },
   mutations: {
      update: mutationOptions({
         mutationKey: mutationKeys.update,
         meta: { errorMessage: 'files.toast.error', handlesVersionConflict: true },
         mutationFn: ({ id, data }: { id: number; data: UpdateFileDto }) =>
            fileControllerUpdate(id, data).then((r) => r.data),
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.all });
         },
      }),
      remove: mutationOptions({
         mutationKey: mutationKeys.remove,
         meta: { errorMessage: 'files.toast.error' },
         mutationFn: ({ id }: { id: number }) => fileControllerRemove(id).then((r) => r.data),
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.all });
            void queryClient.invalidateQueries({ queryKey: trashQueryKeys.all });
         },
      }),
   },
} satisfies ApiDefinitionObject;
