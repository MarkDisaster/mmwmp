import { z } from 'zod/v4';

import { PASSWORD_MIN_LENGTH } from '@/utils/user';

export const createUserSchema = z.object({
   email: z.email(),
   firstName: z.string().min(1),
   lastName: z.string().min(1),
   password: z.string().min(PASSWORD_MIN_LENGTH),
   roleId: z.preprocess(Number, z.number().int().positive()),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
   email: z.email(),
   firstName: z.string().min(1),
   lastName: z.string().min(1),
   roleId: z.preprocess(Number, z.number().int().positive()),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;

export const inviteSchema = z.object({
   email: z.email(),
   roleId: z.preprocess(Number, z.number().int().positive()),
});

export type InviteFormValues = z.infer<typeof inviteSchema>;

export const profileSchema = z.object({
   firstName: z.string().min(1),
   lastName: z.string().min(1),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const passwordSchema = z.object({
   currentPassword: z.string().min(1),
   newPassword: z.string().min(PASSWORD_MIN_LENGTH),
});

export type PasswordFormValues = z.infer<typeof passwordSchema>;
