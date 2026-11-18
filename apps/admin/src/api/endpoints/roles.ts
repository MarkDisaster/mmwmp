import { keepPreviousData, mutationOptions, queryOptions, skipToken } from '@tanstack/react-query';

import { queryKeys as usersKeys } from '@/api/endpoints/users';
import type {
   CreateRoleDto,
   RoleControllerFindAllQueryParams,
   RoleEntity,
   SetPermissionsDto,
   UpdateRoleDto,
} from '@/api/generated';
import {
   roleControllerCreate,
   roleControllerFindAll,
   roleControllerFindOne,
   roleControllerRemove,
   roleControllerSetPermissions,
   roleControllerUpdate,
} from '@/api/generated';
import { optimisticUpdate } from '@/api/optimisticUpdate';
import type { ApiDefinitionObject, MutationKeysObject, QueryKeysObject } from '@/api/types';
import { queryClient } from '@/utils/query-client';

const all = ['roles'] as const;

export const queryKeys = {
   all,
   lists: () => [...all, 'list'] as const,
   list: (params?: RoleControllerFindAllQueryParams) => [...all, 'list', params] as const,
   details: () => [...all, 'detail'] as const,
   detail: (id: number) => [...all, 'detail', id] as const,
} satisfies QueryKeysObject;

const mutationKeys = {
   create: ['roles', 'create'] as const,
   update: ['roles', 'update'] as const,
   remove: ['roles', 'remove'] as const,
   setPermissions: ['roles', 'setPermissions'] as const,
} satisfies MutationKeysObject;

const findRole = (id: number) => roleControllerFindOne(id).then((r) => r.data);

export const roles = {
   queries: {
      all: (params?: RoleControllerFindAllQueryParams) =>
         queryOptions({
            queryKey: queryKeys.list(params),
            queryFn: () => roleControllerFindAll(params).then((r) => r.data),
            placeholderData: keepPreviousData,
         }),
      detail: (id: number) =>
         queryOptions({
            queryKey: queryKeys.detail(id),
            queryFn: () => findRole(id),
         }),
      detailOrSkip: (id: number | null) =>
         queryOptions({
            queryKey:
               id === null ? ([...queryKeys.details(), null] as const) : queryKeys.detail(id),
            queryFn: id === null ? skipToken : () => findRole(id),
         }),
   },
   mutations: {
      create: mutationOptions({
         mutationKey: mutationKeys.create,
         meta: { silent: true },
         mutationFn: ({ data }: { data: CreateRoleDto }) =>
            roleControllerCreate(data).then((r) => r.data),
         onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      }),
      update: mutationOptions({
         mutationKey: mutationKeys.update,
         meta: { silent: true },
         mutationFn: ({ id, data }: { id: number; data: UpdateRoleDto }) =>
            roleControllerUpdate(id, data).then((r) => r.data),
         ...optimisticUpdate(
            ({ id }: { id: number; data: UpdateRoleDto }) => queryKeys.detail(id),
            (old: RoleEntity, { data }) => ({ ...old, name: data.name }),
         ),
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.all });
         },
      }),
      remove: mutationOptions({
         mutationKey: mutationKeys.remove,
         meta: { errorMessage: 'common.error' },
         mutationFn: ({ id }: { id: number }) => roleControllerRemove(id).then((r) => r.data),
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.all });
         },
      }),
      setPermissions: mutationOptions({
         mutationKey: mutationKeys.setPermissions,
         meta: { silent: true },
         mutationFn: ({ id, data }: { id: number; data: SetPermissionsDto }) =>
            roleControllerSetPermissions(id, data).then((r) => r.data),
         ...optimisticUpdate(
            ({ id }: { id: number; data: SetPermissionsDto }) => queryKeys.detail(id),
            (old: RoleEntity, { data }) => ({
               ...old,
               permissions: data.permissions as RoleEntity['permissions'],
            }),
         ),
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.all });
            void queryClient.invalidateQueries({ queryKey: usersKeys.all });
         },
      }),
   },
} satisfies ApiDefinitionObject;
