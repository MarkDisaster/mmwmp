import { z } from 'zod/v4';

import { ABOUT_TITLE_MAX_LENGTH } from '@/features/contact/constants';
import { SUPPORTED_LANGUAGES } from '@/i18n/constants';
import { httpUrlSchema } from '@/utils/httpUrlSchema';

const emptyToNull = (value: string | null | undefined) =>
   value === undefined || value?.trim() === '' ? null : value;

const optionalText = <T extends z.ZodType<string, string>>(schema: T) =>
   z.string().nullish().transform(emptyToNull).pipe(schema.nullable());

const contactTranslationSchema = z.object({
   language: z.enum(SUPPORTED_LANGUAGES),
   description: optionalText(z.string()),
   aboutTitle: optionalText(z.string().max(ABOUT_TITLE_MAX_LENGTH)),
});

export const upsertContactSchema = z.object({
   companyName: optionalText(z.string()),
   phone: optionalText(z.string()),
   email: optionalText(z.email()),
   street: optionalText(z.string()),
   zip: optionalText(z.string()),
   city: optionalText(z.string()),
   ico: optionalText(z.string()),
   vatPayer: z.boolean().optional().default(false),
   linkedinUrl: optionalText(httpUrlSchema),
   githubUrl: optionalText(httpUrlSchema),
   translations: z.array(contactTranslationSchema),
});

export type ContactFormInput = z.input<typeof upsertContactSchema>;
export type ContactFormValues = z.output<typeof upsertContactSchema>;
