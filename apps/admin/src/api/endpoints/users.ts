import { keepPreviousData, mutationOptions, queryOptions } from '@tanstack/react-query';

import type {
   AcceptInvitationDto,
   AdminUpdateUserDto,
   ChangePasswordDto,
   CreateUserDto,
   UpdateNameDto,
   UpdateUserRoleDto,
   UserControllerFindAllQueryParams,
   UserEntity,
   UserInvitationDto,
} from '@/api/generated';
import {
   userControllerAcceptInvitation,
   userControllerAdminUpdate,
   userControllerChangePassword,
   userControllerCreate,
   userControllerDeactivate,
   userControllerDeleteAvatar,
   userControllerFindAll,
   userControllerFindOne,
   userControllerGetMe,
   userControllerInvite,
   userControllerReactivate,
   userControllerRemove,
   userControllerResendInvitation,
   userControllerUpdateAvatar,
   userControllerUpdateName,
   userControllerUpdateRole,
   userControllerVerifyInvitation,
} from '@/api/generated';
import { optimisticUpdate } from '@/api/optimisticUpdate';
import type { ApiDefinitionObject, MutationKeysObject, QueryKeysObject } from '@/api/types';
import { saveAuthSession } from '@/features/auth/auth-query';
import { queryClient } from '@/utils/query-client';

const GENERIC_ERROR = 'common.error';

const all = ['users'] as const;

export const queryKeys = {
   all,
   me: ['users', 'me'] as const,
   lists: () => [...all, 'list'] as const,
   list: (params?: UserControllerFindAllQueryParams) => [...all, 'list', params] as const,
   details: () => [...all, 'detail'] as const,
   detail: (id: number) => [...all, 'detail', id] as const,
} satisfies QueryKeysObject;

const mutationKeys = {
   adminUpdate: ['users', 'adminUpdate'] as const,
   create: ['users', 'create'] as const,
   deactivate: ['users', 'deactivate'] as const,
   reactivate: ['users', 'reactivate'] as const,
   invite: ['users', 'invite'] as const,
   remove: ['users', 'remove'] as const,
   updateName: ['users', 'updateName'] as const,
   updateAvatar: ['users', 'updateAvatar'] as const,
   deleteAvatar: ['users', 'deleteAvatar'] as const,
   updateRole: ['users', 'updateRole'] as const,
   changePassword: ['users', 'changePassword'] as const,
   resendInvitation: ['users', 'resendInvitation'] as const,
   acceptInvitation: ['users', 'acceptInvitation'] as const,
} satisfies MutationKeysObject;

export const users = {
   queries: {
      all: (params?: UserControllerFindAllQueryParams) =>
         queryOptions({
            queryKey: queryKeys.list(params),
            queryFn: () => userControllerFindAll(params).then((r) => r.data),
            placeholderData: keepPreviousData,
         }),
      me: queryOptions({
         queryKey: queryKeys.me,
         queryFn: () => userControllerGetMe().then((r) => r.data),
      }),
      verifyInvitation: (token: string) =>
         queryOptions({
            queryKey: ['users', 'invitation', token] as const,
            queryFn: () => userControllerVerifyInvitation(token),
            retry: false,
         }),
      detail: (id: number) =>
         queryOptions({
            queryKey: queryKeys.detail(id),
            queryFn: () => userControllerFindOne(id).then((r) => r.data),
         }),
   },
   mutations: {
      adminUpdate: mutationOptions({
         mutationKey: mutationKeys.adminUpdate,
         meta: { errorMessage: 'users.toast.updateError' },
         mutationFn: ({ id, data }: { id: number; data: AdminUpdateUserDto }) =>
            userControllerAdminUpdate(id, data).then((r) => r.data),
         onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      }),
      create: mutationOptions({
         mutationKey: mutationKeys.create,
         meta: { errorMessage: 'users.toast.createError' },
         mutationFn: ({ data }: { data: CreateUserDto }) =>
            userControllerCreate(data).then((r) => r.data),
         onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      }),
      deactivate: mutationOptions({
         mutationKey: mutationKeys.deactivate,
         meta: { errorMessage: GENERIC_ERROR },
         mutationFn: ({ id }: { id: number }) => userControllerDeactivate(id).then((r) => r.data),
         onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      }),
      reactivate: mutationOptions({
         mutationKey: mutationKeys.reactivate,
         meta: { errorMessage: GENERIC_ERROR },
         mutationFn: ({ id }: { id: number }) => userControllerReactivate(id).then((r) => r.data),
         onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      }),
      invite: mutationOptions({
         mutationKey: mutationKeys.invite,
         meta: { errorMessage: 'users.toast.inviteError' },
         mutationFn: ({ data }: { data: UserInvitationDto }) =>
            userControllerInvite(data).then((r) => r.data),
         onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      }),
      remove: mutationOptions({
         mutationKey: mutationKeys.remove,
         meta: { errorMessage: GENERIC_ERROR },
         mutationFn: ({ id }: { id: number }) => userControllerRemove(id).then((r) => r.data),
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.all });
         },
      }),
      updateName: mutationOptions({
         mutationKey: mutationKeys.updateName,
         meta: { errorMessage: GENERIC_ERROR },
         mutationFn: ({ data }: { data: UpdateNameDto }) =>
            userControllerUpdateName(data).then((r) => r.data),
         ...optimisticUpdate<{ data: UpdateNameDto }, UserEntity>(
            () => queryKeys.me,
            (old, { data }) => ({ ...old, firstName: data.firstName, lastName: data.lastName }),
         ),
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.me });
         },
      }),
      updateRole: mutationOptions({
         mutationKey: mutationKeys.updateRole,
         meta: { errorMessage: GENERIC_ERROR },
         mutationFn: ({ id, data }: { id: number; data: UpdateUserRoleDto }) =>
            userControllerUpdateRole(id, data).then((r) => r.data),
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.all });
         },
      }),
      updateAvatar: mutationOptions({
         mutationKey: mutationKeys.updateAvatar,
         meta: { errorMessage: 'users.profile.avatar.toast.error' },
         mutationFn: async ({ blob }: { blob: Blob }) => {
            const formData = new FormData();
            formData.append('file', blob, 'avatar.webp');
            return userControllerUpdateAvatar({ data: formData }).then((r) => r.data);
         },
         onSuccess: (data) => {
            queryClient.setQueryData(queryKeys.me, data);
         },
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.me });
         },
      }),
      deleteAvatar: mutationOptions({
         mutationKey: mutationKeys.deleteAvatar,
         meta: { errorMessage: GENERIC_ERROR },
         mutationFn: () => userControllerDeleteAvatar().then((r) => r.data),
         onSuccess: (data) => {
            queryClient.setQueryData(queryKeys.me, data);
         },
         onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.me });
         },
      }),
      changePassword: mutationOptions({
         mutationKey: mutationKeys.changePassword,
         meta: { errorMessage: 'users.toast.passwordError' },
         mutationFn: ({ data }: { data: ChangePasswordDto }) =>
            userControllerChangePassword(data).then((r) => r.data),
      }),
      resendInvitation: mutationOptions({
         mutationKey: mutationKeys.resendInvitation,
         meta: { errorMessage: GENERIC_ERROR },
         mutationFn: ({ id }: { id: number }) =>
            userControllerResendInvitation(id).then((r) => r.data),
         onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
      }),
      acceptInvitation: mutationOptions({
         mutationKey: mutationKeys.acceptInvitation,
         meta: { errorMessage: 'auth.invitation.error' },
         mutationFn: ({ token, data }: { token: string; data: AcceptInvitationDto }) =>
            userControllerAcceptInvitation(token, data).then((r) => r.data),
         onSuccess: (data) => {
            saveAuthSession(data);
         },
      }),
   },
} satisfies ApiDefinitionObject;
