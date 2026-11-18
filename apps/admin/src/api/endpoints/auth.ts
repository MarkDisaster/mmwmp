import { mutationOptions } from '@tanstack/react-query';

import type { ForgotPasswordDto, ResetPasswordDto } from '@/api/generated';
import { authControllerForgotPassword, authControllerResetPassword } from '@/api/generated';
import type { ApiDefinitionObject, MutationKeysObject } from '@/api/types';

const mutationKeys = {
   forgotPassword: ['auth', 'forgotPassword'] as const,
   resetPassword: ['auth', 'resetPassword'] as const,
} satisfies MutationKeysObject;

export const auth = {
   mutations: {
      forgotPassword: mutationOptions({
         mutationKey: mutationKeys.forgotPassword,
         meta: { silent: true },
         mutationFn: ({ data }: { data: ForgotPasswordDto }) =>
            authControllerForgotPassword(data).then((r) => r.data),
      }),
      resetPassword: mutationOptions({
         mutationKey: mutationKeys.resetPassword,
         meta: { silent: true },
         mutationFn: ({ data }: { data: ResetPasswordDto }) =>
            authControllerResetPassword(data).then((r) => r.data),
      }),
   },
} satisfies ApiDefinitionObject;
