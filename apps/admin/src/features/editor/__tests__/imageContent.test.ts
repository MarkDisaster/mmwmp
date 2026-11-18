import { describe, expect, it } from 'vitest';

import type { FileEntity } from '@/api/generated';

import { imageContentFromFile } from '../utils/imageContent';

const ORIGINAL_URL = 'https://cdn.test/original.png';

const makeFile = (overrides: Partial<Record<string, unknown>> = {}) =>
   ({
      originalName: 'photo.png',
      displayName: null,
      altText: null,
      mimeType: 'image/png',
      publicUrl: ORIGINAL_URL,
      variants: [],
      ...overrides,
   }) as unknown as FileEntity;

describe('imageContentFromFile', () => {
   it('should use the medium variant as src and the original as the link href', () => {
      const file = makeFile({
         variants: [{ variant: 'medium', publicUrl: 'https://cdn.test/medium.webp' }],
      });

      expect(imageContentFromFile(file)).toEqual({
         type: 'paragraph',
         content: [
            {
               type: 'image',
               attrs: { src: 'https://cdn.test/medium.webp', alt: 'photo.png' },
               marks: [
                  {
                     type: 'link',
                     attrs: { href: ORIGINAL_URL, target: '_blank', rel: 'noopener noreferrer' },
                  },
               ],
            },
         ],
      });
   });

   it('should fall back to the original for src while the variants do not exist', () => {
      const image = imageContentFromFile(makeFile()).content?.[0];

      expect(image?.attrs?.src).toBe(ORIGINAL_URL);
   });

   it('should take alt from altText, then from the display name', () => {
      const withAlt = makeFile({ altText: 'A cat', displayName: 'Cat photo' });
      const withDisplayName = makeFile({ displayName: 'Cat photo' });
      const withOriginalName = makeFile();

      expect(imageContentFromFile(withAlt).content?.[0].attrs?.alt).toBe('A cat');
      expect(imageContentFromFile(withDisplayName).content?.[0].attrs?.alt).toBe('Cat photo');
      expect(imageContentFromFile(withOriginalName).content?.[0].attrs?.alt).toBe('photo.png');
   });

   it('should not add a link mark for a javascript href', () => {
      const image = imageContentFromFile(makeFile({ publicUrl: 'javascript:alert(1)' }))
         .content?.[0];

      expect(image?.type).toBe('image');
      expect(image?.marks).toBeUndefined();
   });
});
