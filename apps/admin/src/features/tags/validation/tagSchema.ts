import { z } from 'zod/v4';

import { SUPPORTED_LANGUAGES } from '@/i18n/constants';

const MAX_TAG_NAME_LENGTH = 100;

const translationSchema = z.object({
   language: z.enum(SUPPORTED_LANGUAGES),
   name: z.string().trim().min(1).max(MAX_TAG_NAME_LENGTH),
});

export const tagSchema = z.object({
   slug: z.string().min(1),
   color: z.string().optional(),
   translations: z.array(translationSchema).min(1),
});

export type TagTranslationFormValues = z.infer<typeof translationSchema>;
export type TagFormValues = z.infer<typeof tagSchema>;
