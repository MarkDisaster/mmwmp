import { keepPreviousData, mutationOptions, queryOptions } from '@tanstack/react-query';

import {
   fileControllerFindTrashed,
   fileControllerRemovePermanently,
   fileControllerRestore,
   projectControllerFindTrashed,
   projectControllerRemovePermanently,
   projectControllerRestore,
   serviceControllerFindTrashed,
   serviceControllerRemovePermanently,
   serviceControllerRestore,
   tagControllerFindTrashed,
   tagControllerRemovePermanently,
   tagControllerRestore,
} from '@/api/generated';
import { trashQueryKeys } from '@/api/trashKeys';
import type { ApiDefinitionObject, MutationKeysObject, QueryKeysObject } from '@/api/types';
import { queryClient } from '@/utils/query-client';

import { queryKeys as filesKeys } from './files';
import { queryKeys as projectsKeys } from './projects';
import { queryKeys as servicesKeys } from './services';
import { queryKeys as tagsKeys } from './tags';

export const TRASH_TYPES = ['projects', 'services', 'tags', 'files'] as const;
export type TrashType = (typeof TRASH_TYPES)[number];

const queryKeys = {
   all: trashQueryKeys.all,
   type: trashQueryKeys.type,
} satisfies QueryKeysObject;

const mutationKeys = {
   restore: ['trash', 'restore'] as const,
   removePermanently: ['trash', 'removePermanently'] as const,
} satisfies MutationKeysObject;

const FIND_TRASHED = {
   projects: projectControllerFindTrashed,
   services: serviceControllerFindTrashed,
   tags: tagControllerFindTrashed,
   files: fileControllerFindTrashed,
} as const;

export type TrashListParams = NonNullable<Parameters<(typeof FIND_TRASHED)[TrashType]>[0]>;

const RESTORE = {
   projects: projectControllerRestore,
   services: serviceControllerRestore,
   tags: tagControllerRestore,
   files: fileControllerRestore,
} as const;

const REMOVE_PERMANENTLY = {
   projects: projectControllerRemovePermanently,
   services: serviceControllerRemovePermanently,
   tags: tagControllerRemovePermanently,
   files: fileControllerRemovePermanently,
} as const;

const LIVE_KEYS = {
   projects: [projectsKeys.all, servicesKeys.all, tagsKeys.all],
   services: [servicesKeys.all],
   tags: [tagsKeys.all, projectsKeys.all],
   files: [filesKeys.all, projectsKeys.all],
} as const;

export const trash = {
   queries: {
      list: (type: TrashType, params?: TrashListParams) =>
         queryOptions({
            queryKey: [...queryKeys.type(type), params] as const,
            queryFn: () => FIND_TRASHED[type](params).then((r) => r.data),
            placeholderData: keepPreviousData,
         }),
   },
   mutations: {
      restore: mutationOptions({
         mutationKey: mutationKeys.restore,
         meta: { silent: true },
         mutationFn: ({ type, id }: { type: TrashType; id: number }) =>
            RESTORE[type](id).then((r) => r.data),
         onSettled: (_data, _error, { type }) => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.type(type) });
            for (const key of LIVE_KEYS[type]) {
               void queryClient.invalidateQueries({ queryKey: key });
            }
         },
      }),
      removePermanently: mutationOptions({
         mutationKey: mutationKeys.removePermanently,
         meta: { silent: true },
         mutationFn: ({ type, id }: { type: TrashType; id: number }) =>
            REMOVE_PERMANENTLY[type](id).then((r) => r.data),
         onSettled: (_data, _error, { type }) => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.type(type) });
         },
      }),
   },
} satisfies ApiDefinitionObject;
