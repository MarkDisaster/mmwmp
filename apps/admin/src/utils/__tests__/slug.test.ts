import { describe, expect, it } from 'vitest';

import { convertToSlug } from '../slug';

describe('convertToSlug', () => {
   it('should lowercase the text and strip Czech diacritics', () => {
      expect(convertToSlug('Příliš žluťoučký kůň')).toBe('prilis-zlutoucky-kun');
   });

   it('should join words with single hyphens and trim them from the ends', () => {
      expect(convertToSlug('  Hello,   World!  ')).toBe('hello-world');
      expect(convertToSlug('--a__b--')).toBe('a-b');
   });

   it('should keep digits', () => {
      expect(convertToSlug('Web 2.0 v roce 2026')).toBe('web-2-0-v-roce-2026');
   });

   it('should return an empty slug for text without letters or digits', () => {
      expect(convertToSlug('')).toBe('');
      expect(convertToSlug('!@#')).toBe('');
   });
});
