import { describe, expect, it } from 'vitest';

import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';

import { toProjectCards } from '../utils/projectCard';
import { resolveProjectThumbnailAlt } from '../utils/projectThumbnail';

const withThumbnail = (thumbnail: Record<string, unknown> | null) =>
   ({
      id: 1,
      slug: 'shop',
      translations: [{ language: 'en', title: 'Shop' }],
      tags: [],
      thumbnail: thumbnail && {
         variants: [{ variant: 'large', publicUrl: 'https://cdn.test/l.webp' }],
         ...thumbnail,
      },
   }) as unknown as PublicProjectEntity;

describe('resolveProjectThumbnailAlt', () => {
   it('prefers the trimmed alt text', () => {
      const project = withThumbnail({ altText: '  Dashboard of the shop ', displayName: 'file' });

      expect(resolveProjectThumbnailAlt(project, 'Shop')).toBe('Dashboard of the shop');
   });

   it('falls back to the file name, then to the title, when the alt text is empty', () => {
      expect(
         resolveProjectThumbnailAlt(withThumbnail({ altText: '   ', displayName: 'file' }), 'Shop'),
      ).toBe('file');
      expect(
         resolveProjectThumbnailAlt(withThumbnail({ altText: null, displayName: null }), 'Shop'),
      ).toBe('Shop');
      expect(resolveProjectThumbnailAlt(withThumbnail(null), 'Shop')).toBe('Shop');
   });
});

describe('toProjectCards alt', () => {
   it('carries the alt text into the card', () => {
      const [card] = toProjectCards([withThumbnail({ altText: 'Described' })], 'en');

      expect(card?.thumbnail?.alt).toBe('Described');
   });

   it('never yields an empty alt', () => {
      const [card] = toProjectCards([withThumbnail({ altText: '', displayName: '' })], 'en');

      expect(card?.thumbnail?.alt).toBe('Shop');
   });
});
