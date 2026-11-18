import type { Metadata } from 'next';
import { hasLocale, type Locale } from 'next-intl';

import { env } from '@/env';
import { routing } from '@/i18n/routing';

export const SITE_NAME = 'Marek Marek';

export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

export const TWITTER_METADATA = {
   card: 'summary_large_image',
} satisfies NonNullable<Metadata['twitter']>;

export const DEFAULT_OG_IMAGES = [
   { url: '/og-default.png', width: 2400, height: 1260, alt: SITE_NAME },
] satisfies NonNullable<NonNullable<Metadata['openGraph']>['images']>;

const OG_LOCALES = { cs: 'cs_CZ', en: 'en_US' } satisfies Record<Locale, string>;

const toOgLocale = (locale: string): string | undefined =>
   hasLocale(routing.locales, locale) ? OG_LOCALES[locale] : undefined;

const NO_INDEX_ROBOTS = { index: false, follow: false } satisfies NonNullable<Metadata['robots']>;

export function buildLanguageAlternates(
   path = '',
   locales: readonly string[] = routing.locales,
): Record<string, string> {
   const base = env.NEXT_PUBLIC_SITE_URL;
   const defaultLocale = locales.includes(routing.defaultLocale)
      ? routing.defaultLocale
      : locales[0];

   return {
      ...Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])),
      ...(defaultLocale ? { 'x-default': `${base}/${defaultLocale}${path}` } : {}),
   };
}

export function buildAlternates(
   locale: string,
   path = '',
   locales: readonly string[] = routing.locales,
): NonNullable<Metadata['alternates']> {
   const canonical = `${env.NEXT_PUBLIC_SITE_URL}/${locale}${path}`;

   return locales.includes(locale)
      ? { canonical, languages: buildLanguageAlternates(path, locales) }
      : { canonical };
}

type PageMetadataInput = {
   locale: string;
   path?: string;
   title: string | { absolute: string };
   description?: string;
   type?: 'website' | 'article' | 'profile';
   images?: NonNullable<Metadata['openGraph']>['images'];
   locales?: readonly string[];
};

export function buildPageMetadata({
   locale,
   path = '',
   title,
   description,
   type = 'website',
   images,
   locales = routing.locales,
}: PageMetadataInput): Metadata {
   const ogTitle = typeof title === 'string' ? TITLE_TEMPLATE.replace('%s', title) : title.absolute;

   return {
      title,
      description,
      alternates: buildAlternates(locale, path, locales),
      ...(locales.includes(locale) ? {} : { robots: NO_INDEX_ROBOTS }),
      openGraph: {
         type,
         url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}${path}`,
         siteName: SITE_NAME,
         title: ogTitle,
         description,
         locale: toOgLocale(locale),
         alternateLocale: locales
            .filter((l) => l !== locale)
            .map(toOgLocale)
            .filter((l): l is string => l !== undefined),
         images: images ?? DEFAULT_OG_IMAGES,
      },
      twitter: TWITTER_METADATA,
   };
}
