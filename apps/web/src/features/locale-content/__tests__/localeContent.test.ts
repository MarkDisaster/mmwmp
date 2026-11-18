import { describe, expect, it } from 'vitest';

import {
   getPageLocales,
   getPageUpdatedAt,
   hasLocaleContent,
   type LocaleContentSources,
   resolveLocaleContent,
} from '../utils/localeContent';

const NOW = '2026-11-01T10:00:00.000Z';

const sources = (overrides: Partial<LocaleContentSources> = {}): LocaleContentSources => ({
   projects: [{ slug: 'a', updatedAt: '2026-10-01T00:00:00.000Z', locales: ['cs'] }],
   services: [{ updatedAt: '2026-10-05T00:00:00.000Z', locales: ['cs'] }],
   contact: { updatedAt: NOW, translations: [{ language: 'cs', description: '<p>x</p>' }] },
   ...overrides,
});

describe('hasLocaleContent', () => {
   it('is true for a locale with a translated project, service or contact description', () => {
      expect(hasLocaleContent('cs', sources())).toBe(true);
      expect(hasLocaleContent('en', sources({ projects: [], services: [], contact: null }))).toBe(
         false,
      );
      expect(
         hasLocaleContent(
            'en',
            sources({
               projects: [],
               contact: null,
               services: [{ updatedAt: NOW, locales: ['en'] }],
            }),
         ),
      ).toBe(true);
   });

   it('does not count an empty contact translation or contact details alone', () => {
      const contact = {
         updatedAt: NOW,
         translations: [
            { language: 'en', description: '  ' },
            { language: 'en', description: null },
         ],
      };
      expect(hasLocaleContent('en', sources({ contact }))).toBe(false);
   });

   it('counts a contact description in the locale', () => {
      const contact = { updatedAt: NOW, translations: [{ language: 'en', description: 'Hi' }] };
      expect(hasLocaleContent('en', sources({ projects: [], services: [], contact }))).toBe(true);
   });
});

describe('resolveLocaleContent', () => {
   it('lists only locales with content', () => {
      expect(resolveLocaleContent(sources()).locales).toEqual(['cs']);
   });

   it('takes the newest updatedAt of each source', () => {
      const content = resolveLocaleContent(
         sources({
            projects: [
               { slug: 'a', updatedAt: '2026-01-01T00:00:00.000Z', locales: ['cs'] },
               { slug: 'b', updatedAt: '2026-03-01T00:00:00.000Z', locales: ['cs'] },
            ],
         }),
      );
      expect(content.updatedAt.projects).toBe('2026-03-01T00:00:00.000Z');
      expect(content.updatedAt.contact).toBe(NOW);
   });

   it('has no dates and no contact without any record', () => {
      const content = resolveLocaleContent(sources({ projects: [], services: [], contact: null }));
      expect(content).toMatchObject({
         locales: [],
         hasContact: false,
         updatedAt: { contact: null, services: null, projects: null },
      });
   });
});

describe('getPageLocales', () => {
   it('has no locale for the contact page without a contact record', () => {
      const content = resolveLocaleContent(sources({ contact: null }));
      expect(getPageLocales(content, 'contact')).toEqual([]);
      expect(getPageLocales(content, 'about')).toEqual(['cs']);
   });
});

describe('getPageUpdatedAt', () => {
   it('is the newest record the page is built from', () => {
      const content = resolveLocaleContent(sources());
      expect(getPageUpdatedAt(content, 'home')).toBe(NOW);
      expect(getPageUpdatedAt(content, 'projects')).toBe('2026-10-01T00:00:00.000Z');
      expect(getPageUpdatedAt(content, 'contact')).toBe(NOW);
   });

   it('is null when the page has no record', () => {
      const content = resolveLocaleContent(sources({ contact: null, projects: [] }));
      expect(getPageUpdatedAt(content, 'contact')).toBeNull();
      expect(getPageUpdatedAt(content, 'projects')).toBeNull();
   });
});
