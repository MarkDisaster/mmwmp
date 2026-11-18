import { describe, expect, it } from 'vitest';

import { getTagName } from '../getTagName';

const CS_NAME = 'Případová studie';
const EN_NAME = 'Case study';
const CS = { language: 'cs', name: CS_NAME };
const EN = { language: 'en', name: EN_NAME };

describe('getTagName', () => {
   it('returns the name of the locale', () => {
      expect(getTagName({ translations: [CS, EN] }, 'en')).toBe(EN_NAME);
      expect(getTagName({ translations: [CS, EN] }, 'cs')).toBe(CS_NAME);
   });

   it('falls back to Czech when the tag has no name in the locale', () => {
      expect(getTagName({ translations: [CS] }, 'en')).toBe(CS_NAME);
      expect(getTagName({ translations: [EN, CS] }, 'de')).toBe(CS_NAME);
   });

   it('does not throw for a tag without translations (an API that is not migrated yet)', () => {
      expect(getTagName({}, 'cs')).toBe('');
   });

   it('falls back to any name and then to an empty one', () => {
      expect(getTagName({ translations: [EN] }, 'cs')).toBe(EN_NAME);
      expect(getTagName({ translations: [] }, 'cs')).toBe('');
   });
});
