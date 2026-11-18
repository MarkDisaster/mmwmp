import { describe, expect, it } from 'vitest';

import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';

import { toProjectCards } from '../utils/projectCard';

const LARGE_URL = 'https://cdn.test/large.webp';

const tag = (id: number, english = true) => ({
   projectId: 1,
   tagId: id,
   tag: {
      id,
      translations: [
         { language: 'cs', name: `Štítek ${id}` },
         ...(english ? [{ language: 'en', name: `Tag ${id}` }] : []),
      ],
   },
});

const project = (overrides: Record<string, unknown> = {}) =>
   ({
      id: 1,
      slug: 'portfolio',
      translations: [
         { language: 'cs', title: 'Portfolio CZ', content: '<p>obsah</p>' },
         { language: 'en', title: 'Portfolio EN', content: '<p>content</p>' },
      ],
      tags: [tag(1), tag(2)],
      thumbnail: {
         displayName: 'Screenshot',
         variants: [
            { variant: 'medium', publicUrl: 'https://cdn.test/medium.webp' },
            { variant: 'large', publicUrl: LARGE_URL },
         ],
      },
      links: [{ url: 'https://example.com' }],
      media: [{ fileId: 9 }],
      ...overrides,
   }) as unknown as PublicProjectEntity;

describe('toProjectCards', () => {
   it('keeps only what a card renders, in the requested locale', () => {
      expect(toProjectCards([project()], 'en')).toEqual([
         {
            id: 1,
            slug: 'portfolio',
            title: 'Portfolio EN',
            thumbnail: { url: LARGE_URL, alt: 'Screenshot' },
            years: null,
            tags: [
               { id: 1, name: 'Tag 1' },
               { id: 2, name: 'Tag 2' },
            ],
         },
      ]);
   });

   it('names the tags in the locale and falls back to the Czech name without a translation', () => {
      const tags = [tag(1), tag(2, false)];

      expect(toProjectCards([project({ tags })], 'cs')[0]?.tags).toEqual([
         { id: 1, name: 'Štítek 1' },
         { id: 2, name: 'Štítek 2' },
      ]);
      expect(toProjectCards([project({ tags })], 'en')[0]?.tags).toEqual([
         { id: 1, name: 'Tag 1' },
         { id: 2, name: 'Štítek 2' },
      ]);
   });

   it('leaves out a tag without a name, e.g. from an API that is not migrated yet', () => {
      const old = { projectId: 1, tagId: 9, tag: { id: 9, name: 'Old' } };

      expect(toProjectCards([project({ tags: [old, tag(2)] as never })], 'en')[0]?.tags).toEqual([
         { id: 2, name: 'Tag 2' },
      ]);
   });

   it('puts the years of a project on its card', () => {
      const [card] = toProjectCards(
         [project({ startYear: 2024, endYear: 2026, ongoing: false })],
         'cs',
         2027,
      );

      expect(card?.years).toEqual({ from: 2024, to: 2026 });
   });

   it('has no years without a start year', () => {
      const [card] = toProjectCards([project({ startYear: null, endYear: null })], 'cs', 2027);

      expect(card?.years).toBeNull();
   });

   it('keeps the first three tags', () => {
      const [card] = toProjectCards([project({ tags: [tag(1), tag(2), tag(3), tag(4)] })], 'cs');

      expect(card?.tags.map(({ id }) => id)).toEqual([1, 2, 3]);
   });

   it('uses the title as alt text when the thumbnail has no display name', () => {
      const [card] = toProjectCards(
         [
            project({
               thumbnail: {
                  displayName: null,
                  variants: [{ variant: 'large', publicUrl: LARGE_URL }],
               },
            }),
         ],
         'cs',
      );

      expect(card?.thumbnail).toEqual({ url: LARGE_URL, alt: 'Portfolio CZ' });
   });

   it('has no thumbnail when the project has none', () => {
      const [card] = toProjectCards([project({ thumbnail: null })], 'cs');

      expect(card?.thumbnail).toBeNull();
   });

   it('leaves out a project without any translation', () => {
      expect(toProjectCards([project({ translations: [] }), project({ id: 2 })], 'cs')).toEqual([
         expect.objectContaining({ id: 2 }),
      ]);
   });
});
