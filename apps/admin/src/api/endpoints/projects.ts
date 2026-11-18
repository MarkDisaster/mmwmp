import { keepPreviousData, mutationOptions, queryOptions } from '@tanstack/react-query';

import { createMoveMutation } from '@/api/createMoveMutation';
import { removeUnobservedDetail } from '@/api/detailCache';
import type {
   GenerateProjectTranslationRequestDto,
   ProjectControllerFindAllQueryParams,
   ProjectControllerGenerateTranslationPathParamsLanguageEnumKey,
   ProjectEntity,
   SaveProjectDto,
   UpdateStatusDto,
} from '@/api/generated';
import {
   projectControllerFindAll,
   projectControllerFindOne,
   projectControllerGenerateTranslation,
   projectControllerMove,
   projectControllerRemove,
   projectControllerSaveExisting,
   projectControllerSaveNew,
   projectControllerUpdateStatus,
} from '@/api/generated';
import { optimisticUpdate } from '@/api/optimisticUpdate';
import { trashQueryKeys } from '@/api/trashKeys';
import type { ApiDefinitionObject, MutationKeysObject, QueryKeysObject } from '@/api/types';
import { queryClient } from '@/utils/query-client';

const all = ['projects'] as const;

export const queryKeys = {
   all,
   lists: () => [...all, 'list'] as const,
   list: (params?: ProjectControllerFindAllQueryParams) => [...all, 'list', params] as const,
   details: () => [...all, 'detail'] as const,
   detail: (id: number) => [...all, 'detail', id] as const,
} satisfies QueryKeysObject;

const mutationKeys = {
   saveNew: ['projects', 'saveNew'] as const,
   saveExisting: ['projects', 'saveExisting'] as const,
   remove: ['projects', 'remove'] as const,
   move: ['projects', 'move'] as const,
   updateStatus: ['projects', 'updateStatus'] as const,
   generateTranslation: ['projects', 'generateTranslation'] as const,
} satisfies MutationKeysObject;

const storeSavedProject = (project: ProjectEntity) => {
   queryClient.setQueryData(queryKeys.detail(project.id), project);
   void queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
};

export const projects = {
   queries: {
      all: (params?: ProjectControllerFindAllQueryParams) =>
         queryOptions({
            queryKey: queryKeys.list(params),
            queryFn: () => projectControllerFindAll(params).then((r) => r.data),
            placeholderData: keepPreviousData,
         }),
      detail: (id: number) =>
         queryOptions({
            queryKey: queryKeys.detail(id),
            queryFn: () => projectControllerFindOne(id).then((r) => r.data),
         }),
   },
   mutations: {
      saveNew: mutationOptions({
         mutationKey: mutationKeys.saveNew,
         meta: { silent: true },
         mutationFn: ({ data }: { data: SaveProjectDto }) =>
            projectControllerSaveNew(data).then((r) => r.data),
         onSuccess: storeSavedProject,
      }),
      saveExisting: mutationOptions({
         mutationKey: mutationKeys.saveExisting,
         meta: { silent: true },
         mutationFn: ({ id, data }: { id: number; data: SaveProjectDto }) =>
            projectControllerSaveExisting(id, data).then((r) => r.data),
         onSuccess: storeSavedProject,
      }),
      remove: mutationOptions({
         mutationKey: mutationKeys.remove,
         meta: { silent: true },
         mutationFn: ({ id }: { id: number }) => projectControllerRemove(id).then((r) => r.data),
         onSuccess: (_data, { id }) => removeUnobservedDetail(queryKeys.detail(id)),
         onSettled: (_data, _error, { id }) => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
            void queryClient.invalidateQueries({
               queryKey: queryKeys.detail(id),
               refetchType: 'none',
            });
            void queryClient.invalidateQueries({ queryKey: trashQueryKeys.all });
         },
      }),
      move: createMoveMutation<ProjectEntity>({
         mutationKey: mutationKeys.move,
         listKey: queryKeys.lists(),
         detailKey: queryKeys.detail,
         errorMessage: 'projects.toast.reorderFailed',
         request: (id, data) => projectControllerMove(id, data).then((r) => r.data),
      }),
      updateStatus: mutationOptions({
         mutationKey: mutationKeys.updateStatus,
         meta: { silent: true },
         mutationFn: ({ id, data }: { id: number; data: UpdateStatusDto }) =>
            projectControllerUpdateStatus(id, data).then((r) => r.data),
         ...optimisticUpdate(
            ({ id }: { id: number; data: UpdateStatusDto }) => queryKeys.detail(id),
            (old: ProjectEntity, { data }) => ({ ...old, status: data.status }),
         ),
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.all });
         },
      }),
      generateTranslation: mutationOptions({
         mutationKey: mutationKeys.generateTranslation,
         meta: { silent: true },
         mutationFn: ({
            id,
            language,
            data,
         }: {
            id: number;
            language: ProjectControllerGenerateTranslationPathParamsLanguageEnumKey;
            data: GenerateProjectTranslationRequestDto;
         }) => projectControllerGenerateTranslation(id, language, data).then((r) => r.data),
      }),
   },
} satisfies ApiDefinitionObject;
