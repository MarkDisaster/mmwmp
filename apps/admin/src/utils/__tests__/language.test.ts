import { describe, expect, it } from 'vitest';

import { toLanguageCode } from '../language';

describe('toLanguageCode', () => {
   it('should keep the base code of a regional language', () => {
      expect(toLanguageCode('en-US')).toBe('en');
      expect(toLanguageCode('cs')).toBe('cs');
   });

   it('should fall back to Czech when no language is set', () => {
      expect(toLanguageCode(undefined)).toBe('cs');
      expect(toLanguageCode('')).toBe('cs');
   });
});
