import i18next from 'i18next';
import { z } from 'zod/v4';

import type { FileEntity } from '@/api/generated';
import { SUPPORTED_LANGUAGES } from '@/i18n/constants';
import { httpUrlSchema } from '@/utils/httpUrlSchema';

const MIN_YEAR = 1990;
const MAX_YEAR = 2100;
const MAX_COMPANY_LENGTH = 200;
const MAX_ROLE_LENGTH = 100;
const MAX_LINK_LABEL_LENGTH = 50;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MAX_PROJECT_LINKS = 11;

const yearSchema = z
   .string()
   .refine(
      (value) =>
         value === '' || (/^\d{4}$/.test(value) && +value >= MIN_YEAR && +value <= MAX_YEAR),
      { error: () => i18next.t('validation.yearInvalid', { min: MIN_YEAR, max: MAX_YEAR }) },
   );

const linkSchema = z.object({
   label: z.string().max(MAX_LINK_LABEL_LENGTH).optional(),
   url: httpUrlSchema,
});

const mediaSchema = z.object({
   id: z.number().optional(),
   fileId: z.number(),
   language: z.enum(SUPPORTED_LANGUAGES).nullable(),
});

const RICH_TEXT_MEDIA_TAG = /<(img|hr)\b/i;

const hasRichTextContent = (html: string) =>
   RICH_TEXT_MEDIA_TAG.test(html) ||
   html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .trim() !== '';

const requiredRichTextSchema = z
   .string()
   .trim()
   .superRefine((html, ctx) => {
      if (hasRichTextContent(html)) return;
      ctx.addIssue({
         code: 'too_small',
         origin: 'string',
         minimum: 1,
         inclusive: true,
         input: html,
      });
   });

const translationSchema = z.object({
   language: z.enum(SUPPORTED_LANGUAGES),
   title: z.string().trim().min(1),
   role: z.string().max(MAX_ROLE_LENGTH).optional(),
   description: z.string().trim().min(1),
   content: requiredRichTextSchema,
   metaTitle: z.string().optional(),
   metaDescription: z.string().optional(),
});

export const projectSchema = z
   .object({
      company: z.string().max(MAX_COMPANY_LENGTH).optional(),
      startYear: yearSchema,
      endYear: yearSchema,
      ongoing: z.boolean(),
      links: z.array(linkSchema).max(MAX_PROJECT_LINKS, {
         error: () => i18next.t('validation.linksMax', { max: MAX_PROJECT_LINKS }),
      }),
      slug: z
         .string()
         .trim()
         .min(1, { error: () => i18next.t('projects.validation.slugRequired'), abort: true })
         .regex(SLUG_PATTERN, { error: () => i18next.t('projects.validation.slugInvalid') }),
      thumbnail: z.custom<FileEntity>().nullable(),
      tags: z.array(z.object({ id: z.number(), name: z.string() })),
      showOnHomepage: z.boolean(),
      media: z.array(mediaSchema),
      translations: z.array(translationSchema).min(1),
   })
   .refine((data) => !data.endYear || data.startYear !== '', {
      error: () => i18next.t('validation.endYearRequiresStart'),
      path: ['endYear'],
   })
   .refine((data) => !data.ongoing || data.startYear !== '', {
      error: () => i18next.t('validation.endYearRequiresStart'),
      path: ['ongoing'],
   })

   .refine((data) => !data.endYear || !data.startYear || +data.endYear >= +data.startYear, {
      error: () => i18next.t('validation.endYearBeforeStart'),
      path: ['endYear'],
   });

export type MediaFormValues = z.infer<typeof mediaSchema>;
export type TranslationFormValues = z.infer<typeof translationSchema>;
export type ProjectFormValues = z.infer<typeof projectSchema>;
