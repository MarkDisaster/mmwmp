import { describe, expect, it } from 'vitest';

import { getTranslation } from '../getTranslation';

const cs = { language: 'cs', title: 'Ahoj' };
const en = { language: 'en', title: 'Hello' };

describe('getTranslation', () => {
   it('returns the translation in the requested locale', () => {
      expect(getTranslation({ translations: [cs, en] }, 'en')).toBe(en);
   });

   it('falls back to the first translation when the locale is missing', () => {
      expect(getTranslation({ translations: [cs] }, 'en')).toBe(cs);
   });

   it('returns undefined when there is no translation at all', () => {
      expect(getTranslation({ translations: [] }, 'cs')).toBeUndefined();
   });
});
