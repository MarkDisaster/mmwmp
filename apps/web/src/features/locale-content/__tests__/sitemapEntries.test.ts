import { describe, expect, it, vi } from 'vitest';

import { type LocaleContentSources, resolveLocaleContent } from '../utils/localeContent';
import { buildSitemapEntries } from '../utils/sitemapEntries';

vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_SITE_URL: 'https://marek.media' } }));

const BASE = 'https://marek.media';
const CS_CONTACT = `${BASE}/cs/contact`;
const PROJECT_DATE = '2026-10-01T00:00:00.000Z';
const CONTACT_DATE = '2026-11-01T10:00:00.000Z';

const content = (overrides: Partial<LocaleContentSources> = {}) =>
   resolveLocaleContent({
      projects: [{ slug: 'a', updatedAt: PROJECT_DATE, locales: ['cs'] }],
      services: [],
      contact: { updatedAt: CONTACT_DATE, translations: [] },
      ...overrides,
   });

const urls = (entries: ReturnType<typeof buildSitemapEntries>) => entries.map((e) => e.url);

describe('buildSitemapEntries', () => {
   it('omits every page of a locale without content, in entries and in hreflang', () => {
      const entries = buildSitemapEntries(content());

      expect(urls(entries)).toEqual([
         BASE + '/cs',
         `${BASE}/cs/projects`,
         `${BASE}/cs/about`,
         `${BASE}/cs/contact`,
         `${BASE}/cs/projects/a`,
      ]);
      for (const entry of entries) {
         expect(Object.keys(entry.alternates?.languages ?? {})).toEqual(['cs', 'x-default']);
      }
   });

   it('lists a locale once it has content, with reciprocal hreflang', () => {
      const entries = buildSitemapEntries(
         content({ services: [{ updatedAt: PROJECT_DATE, locales: ['en'] }] }),
      );
      const en = entries.find((e) => e.url === 'https://marek.media/en/about');

      expect(en?.alternates?.languages).toEqual({
         cs: `${BASE}/cs/about`,
         en: 'https://marek.media/en/about',
         'x-default': `${BASE}/cs/about`,
      });
      expect(urls(entries)).not.toContain('https://marek.media/en/projects/a');
   });

   it('leaves out /contact when the contact record does not exist', () => {
      expect(urls(buildSitemapEntries(content({ contact: null })))).not.toContain(
         `${BASE}/cs/contact`,
      );
   });

   it('takes lastmod from the records, never from the build time', () => {
      const entries = buildSitemapEntries(content());
      const lastmod = (url: string) => entries.find((e) => e.url === url)?.lastModified;

      expect(lastmod(`${BASE}/cs/projects/a`)).toEqual(new Date(PROJECT_DATE));
      expect(lastmod(CS_CONTACT)).toEqual(new Date(CONTACT_DATE));
      expect(lastmod(`${BASE}/cs/projects`)).toEqual(new Date(PROJECT_DATE));
   });

   it('has no lastmod for a page without any record', () => {
      const entries = buildSitemapEntries(content({ projects: [], contact: null }));
      expect(entries.every((e) => e.lastModified === undefined)).toBe(true);
   });
});
