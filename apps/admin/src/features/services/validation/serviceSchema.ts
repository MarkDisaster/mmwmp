import i18next from 'i18next';
import { z } from 'zod/v4';

import { SUPPORTED_LANGUAGES } from '@/i18n/constants';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const translationSchema = z.object({
   language: z.enum(SUPPORTED_LANGUAGES),
   title: z.string().trim().min(1),
   description: z.string().optional(),
   content: z.string().optional(),
   metaTitle: z.string().optional(),
   metaDescription: z.string().optional(),
});

export const serviceSchema = z.object({
   slug: z
      .string()
      .trim()
      .min(1, { error: () => i18next.t('services.validation.slugRequired'), abort: true })
      .regex(SLUG_PATTERN, { error: () => i18next.t('services.validation.slugInvalid') }),
   showOnHomepage: z.boolean(),
   projects: z.array(z.object({ id: z.number(), title: z.string() })),
   translations: z.array(translationSchema).min(1),
});

export type ServiceTranslationFormValues = z.infer<typeof translationSchema>;
export type ServiceFormValues = z.infer<typeof serviceSchema>;
