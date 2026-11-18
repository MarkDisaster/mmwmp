import { routing } from '@/i18n/routing';

export const DRAFT_TYPES = ['projects', 'services'] as const;
export type DraftType = (typeof DRAFT_TYPES)[number];

export const isDraftType = (value: string): value is DraftType =>
   (DRAFT_TYPES as readonly string[]).includes(value);

export const resolveDraftLocale = (locale: string | null) =>
   routing.locales.find((known) => known === locale) ?? routing.defaultLocale;

export const getDraftPath = (type: DraftType, locale: string, slug: string) =>
   type === 'services' ? `/${locale}/about#${slug}` : `/${locale}/projects/${slug}`;
