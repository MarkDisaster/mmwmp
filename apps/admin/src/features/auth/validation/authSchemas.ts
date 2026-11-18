import i18next from 'i18next';
import { z } from 'zod/v4';

import { PASSWORD_MIN_LENGTH } from '@/utils/user';

const passwordsDoNotMatch = () => i18next.t('validation.passwordsDoNotMatch');

export const loginSchema = z.object({
   email: z.email(),
   password: z.string().min(1),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
   email: z.email(),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
   .object({
      newPassword: z.string().min(PASSWORD_MIN_LENGTH),
      confirmPassword: z.string().min(1),
   })
   .refine((data) => data.newPassword === data.confirmPassword, {
      error: passwordsDoNotMatch,
      path: ['confirmPassword'],
   });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const acceptInvitationSchema = z
   .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      password: z.string().min(PASSWORD_MIN_LENGTH),
      confirmPassword: z.string().min(1),
   })
   .refine((data) => data.password === data.confirmPassword, {
      error: passwordsDoNotMatch,
      path: ['confirmPassword'],
   });

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;
