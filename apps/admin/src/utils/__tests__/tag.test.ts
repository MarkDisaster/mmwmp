import { describe, expect, it } from 'vitest';

import { getTagName } from '../tag';

const CS_NAME = 'Případová studie';
const EN_NAME = 'Case study';
const CS = { language: 'cs', name: CS_NAME };
const EN = { language: 'en', name: EN_NAME };

describe('getTagName', () => {
   it('should return the name in the language, matching a UI language by its base code', () => {
      expect(getTagName({ translations: [CS, EN] }, 'en')).toBe(EN_NAME);
      expect(getTagName({ translations: [CS, EN] }, 'en-US')).toBe(EN_NAME);
      expect(getTagName({ translations: [CS, EN] }, 'cs-CZ')).toBe(CS_NAME);
   });

   it('should fall back to Czech when the tag has no name in the language', () => {
      expect(getTagName({ translations: [CS] }, 'en')).toBe(CS_NAME);
      expect(getTagName({ translations: [EN, CS] })).toBe(CS_NAME);
   });

   it('should fall back to any name, then to a dash', () => {
      expect(getTagName({ translations: [EN] }, 'cs')).toBe(EN_NAME);
      expect(getTagName({ translations: [] }, 'cs')).toBe('—');
   });
});
