import { describe, expect, it } from 'vitest';

import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';

import { projectDetailLocales, toProjectLocales } from '../utils/projectLocales';

const project = (slug: string, languages: string[]) =>
   ({
      slug,
      updatedAt: '2025-01-01T00:00:00.000Z',
      translations: languages.map((language) => ({ language })),
   }) as unknown as Pick<PublicProjectEntity, 'slug' | 'updatedAt' | 'translations'>;

describe('toProjectLocales', () => {
   it('lists the site locales the project is translated into', () => {
      expect(toProjectLocales([project('a', ['en', 'cs'])])).toEqual([
         { slug: 'a', updatedAt: '2025-01-01T00:00:00.000Z', locales: ['cs', 'en'] },
      ]);
   });

   it('leaves out a locale without a translation', () => {
      expect(toProjectLocales([project('a', ['en'])])[0]?.locales).toEqual(['en']);
   });

   it('ignores translations in languages the site does not have', () => {
      expect(toProjectLocales([project('a', ['cs', 'de'])])[0]?.locales).toEqual(['cs']);
   });

   it('gives a project without translations no locale', () => {
      expect(toProjectLocales([project('a', [])])[0]?.locales).toEqual([]);
   });
});

describe('projectDetailLocales', () => {
   const entries = [
      { slug: 'a', updatedAt: '1970-01-01T00:00:00.000Z', locales: ['cs', 'en'] },
      { slug: 'b', updatedAt: '1970-01-01T00:00:00.000Z', locales: ['cs'] },
   ];

   it('returns every locale of a project that exists in the rendered one', () => {
      expect(projectDetailLocales(entries, 'a', 'en')).toEqual(['cs', 'en']);
   });

   it('returns only the rendered locale for an unknown slug', () => {
      expect(projectDetailLocales(entries, 'draft', 'en')).toEqual(['en']);
   });

   it('returns only the rendered locale when the project has none in it', () => {
      expect(projectDetailLocales(entries, 'b', 'en')).toEqual(['en']);
   });
});
