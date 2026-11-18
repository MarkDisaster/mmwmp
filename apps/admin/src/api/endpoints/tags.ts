import { keepPreviousData, mutationOptions, queryOptions } from '@tanstack/react-query';

import { createMoveMutation } from '@/api/createMoveMutation';
import { queryKeys as projectsQueryKeys } from '@/api/endpoints/projects';
import type {
   CreateTagDto,
   TagControllerFindAllQueryParams,
   TagEntity,
   UpdateTagDto,
} from '@/api/generated';
import {
   tagControllerCreate,
   tagControllerFindAll,
   tagControllerFindOne,
   tagControllerMove,
   tagControllerRemove,
   tagControllerUpdate,
} from '@/api/generated';
import { trashQueryKeys } from '@/api/trashKeys';
import type { ApiDefinitionObject, MutationKeysObject, QueryKeysObject } from '@/api/types';
import { isVersionConflict } from '@/utils/httpError';
import { queryClient } from '@/utils/query-client';

const all = ['tags'] as const;

export const queryKeys = {
   all,
   lists: () => [...all, 'list'] as const,
   list: (params?: TagControllerFindAllQueryParams) => [...all, 'list', params] as const,
   details: () => [...all, 'detail'] as const,
   detail: (id: number) => [...all, 'detail', id] as const,
} satisfies QueryKeysObject;

const mutationKeys = {
   create: ['tags', 'create'] as const,
   update: ['tags', 'update'] as const,
   remove: ['tags', 'remove'] as const,
   move: ['tags', 'move'] as const,
} satisfies MutationKeysObject;

export const tags = {
   queries: {
      all: (params?: TagControllerFindAllQueryParams) =>
         queryOptions({
            queryKey: queryKeys.list(params),
            queryFn: () => tagControllerFindAll(params).then((r) => r.data),
            placeholderData: keepPreviousData,
         }),
      detail: (id: number) =>
         queryOptions({
            queryKey: queryKeys.detail(id),
            queryFn: () => tagControllerFindOne(id).then((r) => r.data),
         }),
   },
   mutations: {
      create: mutationOptions({
         mutationKey: mutationKeys.create,
         meta: { errorMessage: 'tags.toast.error' },
         mutationFn: ({ data }: { data: CreateTagDto }) =>
            tagControllerCreate(data).then((r) => r.data),
         onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      }),
      update: mutationOptions({
         mutationKey: mutationKeys.update,
         meta: { errorMessage: 'tags.toast.error', handlesVersionConflict: true },
         mutationFn: ({ id, data }: { id: number; data: UpdateTagDto }) =>
            tagControllerUpdate(id, data).then((r) => r.data),
         onSuccess: (saved) => queryClient.setQueryData(queryKeys.detail(saved.id), saved),
         onSettled: (_saved, error) => {
            if (isVersionConflict(error)) return;
            void queryClient.invalidateQueries({ queryKey: queryKeys.all });
            void queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all });
         },
      }),
      remove: mutationOptions({
         mutationKey: mutationKeys.remove,
         meta: { errorMessage: 'common.error' },
         mutationFn: ({ id }: { id: number }) => tagControllerRemove(id).then((r) => r.data),
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.all });
            void queryClient.invalidateQueries({ queryKey: trashQueryKeys.all });
         },
      }),
      move: createMoveMutation<TagEntity>({
         mutationKey: mutationKeys.move,
         listKey: queryKeys.lists(),
         detailKey: queryKeys.detail,
         errorMessage: 'tags.toast.reorderFailed',
         request: (id, data) => tagControllerMove(id, data).then((r) => r.data),
      }),
   },
} satisfies ApiDefinitionObject;
