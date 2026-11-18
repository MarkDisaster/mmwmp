import { describe, expect, it, vi } from 'vitest';

import {
   buildAlternates,
   buildLanguageAlternates,
   buildPageMetadata,
   DEFAULT_OG_IMAGES,
   SITE_NAME,
} from '../seo';

vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_SITE_URL: 'https://marek.media' } }));

const url = (path: string) => `https://marek.media${path}`;
const PROJECT_PATH = '/projects/a';

describe('buildLanguageAlternates', () => {
   it('lists every locale with x-default on the default locale', () => {
      expect(buildLanguageAlternates('/about')).toEqual({
         cs: url('/cs/about'),
         en: url('/en/about'),
         'x-default': url('/cs/about'),
      });
   });

   it('lists the home page without a trailing path', () => {
      expect(buildLanguageAlternates()).toEqual({
         cs: url('/cs'),
         en: url('/en'),
         'x-default': url('/cs'),
      });
   });

   it('lists only the locales the page exists in', () => {
      expect(buildLanguageAlternates(PROJECT_PATH, ['cs'])).toEqual({
         cs: url(`/cs${PROJECT_PATH}`),
         'x-default': url(`/cs${PROJECT_PATH}`),
      });
   });

   it('puts x-default on the first locale when the default locale is missing', () => {
      expect(buildLanguageAlternates(PROJECT_PATH, ['en'])).toEqual({
         en: url(`/en${PROJECT_PATH}`),
         'x-default': url(`/en${PROJECT_PATH}`),
      });
   });

   it('returns no alternates for a page in no locale', () => {
      expect(buildLanguageAlternates(PROJECT_PATH, [])).toEqual({});
   });
});

describe('buildAlternates', () => {
   it('uses the rendered locale as the canonical', () => {
      expect(buildAlternates('en', '/contact')).toEqual({
         canonical: url('/en/contact'),
         languages: buildLanguageAlternates('/contact'),
      });
   });
});

describe('buildPageMetadata', () => {
   it('noindexes a page in a locale it does not exist in and gives it no hreflang', () => {
      const metadata = buildPageMetadata({ locale: 'en', title: 'T', locales: ['cs'] });

      expect(metadata.robots).toEqual({ index: false, follow: false });
      expect(metadata.alternates).toEqual({ canonical: url('/en') });
   });

   it('leaves robots to the layout for a page that exists', () => {
      const metadata = buildPageMetadata({ locale: 'cs', title: 'T', locales: ['cs'] });

      expect(metadata.robots).toBeUndefined();
      expect(metadata.alternates?.languages).toEqual({ cs: url('/cs'), 'x-default': url('/cs') });
   });

   it('builds complete Open Graph and Twitter objects', () => {
      expect(
         buildPageMetadata({ locale: 'cs', path: '/about', title: 'O mně', description: 'Popis' }),
      ).toEqual({
         title: 'O mně',
         description: 'Popis',
         alternates: buildAlternates('cs', '/about'),
         openGraph: {
            type: 'website',
            url: url('/cs/about'),
            siteName: SITE_NAME,
            title: `O mně | ${SITE_NAME}`,
            description: 'Popis',
            locale: 'cs_CZ',
            alternateLocale: ['en_US'],
            images: DEFAULT_OG_IMAGES,
         },
         twitter: { card: 'summary_large_image' },
      });
   });

   it('keeps an absolute title without the site name', () => {
      const metadata = buildPageMetadata({ locale: 'en', title: { absolute: SITE_NAME } });

      expect(metadata.title).toEqual({ absolute: SITE_NAME });
      expect(metadata.openGraph?.title).toBe(SITE_NAME);
   });

   it('limits hreflang and alternate locales to the locales of the page', () => {
      const metadata = buildPageMetadata({
         locale: 'en',
         path: PROJECT_PATH,
         title: 'A',
         locales: ['en'],
      });

      expect(metadata.alternates?.languages).toEqual(buildLanguageAlternates(PROJECT_PATH, ['en']));
      expect(metadata.openGraph?.alternateLocale).toEqual([]);
   });

   it('passes the type and the images through', () => {
      const images = [{ url: 'https://cdn.example.com/a.png', width: 2400, height: 630 }];
      const metadata = buildPageMetadata({ locale: 'cs', title: 'A', type: 'article', images });

      expect(metadata.openGraph).toMatchObject({ type: 'article', images });
   });

   it('falls back to the default Open Graph image (2400x1260)', () => {
      const metadata = buildPageMetadata({ locale: 'cs', title: 'A' });

      expect(metadata.openGraph).toMatchObject({ images: DEFAULT_OG_IMAGES });
      expect(DEFAULT_OG_IMAGES[0]).toMatchObject({
         url: '/og-default.png',
         width: 2400,
         height: 1260,
      });
   });
});
