import { keepPreviousData, mutationOptions, queryOptions } from '@tanstack/react-query';

import { createMoveMutation } from '@/api/createMoveMutation';
import { removeUnobservedDetail } from '@/api/detailCache';
import type {
   GenerateServiceTranslationRequestDto,
   SaveServiceDto,
   ServiceControllerFindAllQueryParams,
   ServiceControllerGenerateTranslationPathParamsLanguageEnumKey,
   ServiceEntity,
   UpdateStatusDto,
} from '@/api/generated';
import {
   serviceControllerFindAll,
   serviceControllerFindOne,
   serviceControllerMove,
   serviceControllerRemove,
   serviceControllerSave,
   serviceControllerSaveNew,
   serviceControllerUpdateStatus,
} from '@/api/generated';
import { serviceControllerGenerateTranslation } from '@/api/generated/clients/serviceControllerGenerateTranslation';
import { optimisticUpdate } from '@/api/optimisticUpdate';
import { trashQueryKeys } from '@/api/trashKeys';
import type { ApiDefinitionObject, MutationKeysObject, QueryKeysObject } from '@/api/types';
import { queryClient } from '@/utils/query-client';

const all = ['services'] as const;

export const queryKeys = {
   all,
   lists: () => [...all, 'list'] as const,
   list: (params?: ServiceControllerFindAllQueryParams) => [...all, 'list', params] as const,
   details: () => [...all, 'detail'] as const,
   detail: (id: number) => [...all, 'detail', id] as const,
} satisfies QueryKeysObject;

const mutationKeys = {
   saveNew: ['services', 'saveNew'] as const,
   saveExisting: ['services', 'saveExisting'] as const,
   remove: ['services', 'remove'] as const,
   move: ['services', 'move'] as const,
   updateStatus: ['services', 'updateStatus'] as const,
   generateTranslation: ['services', 'generateTranslation'] as const,
} satisfies MutationKeysObject;

const storeSavedService = (service: ServiceEntity) => {
   queryClient.setQueryData(queryKeys.detail(service.id), service);
   void queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
};

export const services = {
   queries: {
      all: (params?: ServiceControllerFindAllQueryParams) =>
         queryOptions({
            queryKey: queryKeys.list(params),
            queryFn: () => serviceControllerFindAll(params).then((r) => r.data),
            placeholderData: keepPreviousData,
         }),
      detail: (id: number) =>
         queryOptions({
            queryKey: queryKeys.detail(id),
            queryFn: () => serviceControllerFindOne(id).then((r) => r.data),
         }),
   },
   mutations: {
      saveNew: mutationOptions({
         mutationKey: mutationKeys.saveNew,
         meta: { silent: true },
         mutationFn: ({ data }: { data: SaveServiceDto }) =>
            serviceControllerSaveNew(data).then((r) => r.data),
         onSuccess: storeSavedService,
      }),
      saveExisting: mutationOptions({
         mutationKey: mutationKeys.saveExisting,
         meta: { silent: true },
         mutationFn: ({ id, data }: { id: number; data: SaveServiceDto }) =>
            serviceControllerSave(id, data).then((r) => r.data),
         onSuccess: storeSavedService,
      }),
      remove: mutationOptions({
         mutationKey: mutationKeys.remove,
         meta: { silent: true },
         mutationFn: ({ id }: { id: number }) => serviceControllerRemove(id).then((r) => r.data),
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
      move: createMoveMutation<ServiceEntity>({
         mutationKey: mutationKeys.move,
         listKey: queryKeys.lists(),
         detailKey: queryKeys.detail,
         errorMessage: 'services.toast.reorderFailed',
         request: (id, data) => serviceControllerMove(id, data).then((r) => r.data),
      }),
      updateStatus: mutationOptions({
         mutationKey: mutationKeys.updateStatus,
         meta: { silent: true },
         mutationFn: ({ id, data }: { id: number; data: UpdateStatusDto }) =>
            serviceControllerUpdateStatus(id, data).then((r) => r.data),
         ...optimisticUpdate(
            ({ id }: { id: number; data: UpdateStatusDto }) => queryKeys.detail(id),
            (old: ServiceEntity, { data }) => ({ ...old, status: data.status }),
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
            language: ServiceControllerGenerateTranslationPathParamsLanguageEnumKey;
            data: GenerateServiceTranslationRequestDto;
         }) => serviceControllerGenerateTranslation(id, language, data).then((r) => r.data),
      }),
   },
} satisfies ApiDefinitionObject;
