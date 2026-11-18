import { describe, expect, it } from 'vitest';

import { getAboutContent } from '../utils/aboutContent';

const contact = {
   translations: [
      { language: 'cs', aboutTitle: 'O mně česky', description: '<p>text cs</p>' },
      { language: 'en', aboutTitle: null, description: '<p>text en</p>' },
   ],
};

describe('getAboutContent', () => {
   it('returns the heading and the text of the locale', () => {
      expect(getAboutContent(contact, 'cs')).toEqual({
         title: 'O mně česky',
         description: '<p>text cs</p>',
      });
   });

   it('has no heading when it is not filled in, so the section uses its default title', () => {
      expect(getAboutContent(contact, 'en')).toEqual({
         title: null,
         description: '<p>text en</p>',
      });
   });

   it('treats a heading missing from an older API answer like an empty one', () => {
      const old = { translations: [{ language: 'cs', description: '<p>text</p>' }] };

      expect(getAboutContent(old, 'cs').title).toBeNull();
   });

   it('is empty without a contact or a translation of the locale', () => {
      expect(getAboutContent(null, 'cs')).toEqual({ title: null, description: null });
      expect(getAboutContent(contact, 'de')).toEqual({ title: null, description: null });
   });
});
