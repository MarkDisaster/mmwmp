import { describe, expect, it } from 'vitest';

import cs from '../../../../messages/cs.json';
import en from '../../../../messages/en.json';

const MESSAGES = { cs: cs.Privacy, en: en.Privacy };
const LOCALES = Object.keys(MESSAGES) as (keyof typeof MESSAGES)[];

const RICH_TAGS = {
   whoText: ['contact'],
   rightsText: ['contact', 'uoou'],
} as const;

describe('Privacy messages', () => {
   it('should have the same keys in every locale', () => {
      expect(Object.keys(MESSAGES.en).sort()).toEqual(Object.keys(MESSAGES.cs).sort());
   });

   it('should have no empty text', () => {
      for (const locale of LOCALES) {
         for (const [key, value] of Object.entries(MESSAGES[locale])) {
            expect(value.trim(), `${locale}.${key}`).not.toBe('');
         }
      }
   });

   it('should keep the rich-text tags in every locale', () => {
      for (const locale of LOCALES) {
         for (const [key, tags] of Object.entries(RICH_TAGS)) {
            const text = MESSAGES[locale][key as keyof (typeof MESSAGES)[typeof locale]];
            for (const tag of tags) {
               expect(text, `${locale}.${key}`).toContain(`<${tag}>`);
               expect(text, `${locale}.${key}`).toContain(`</${tag}>`);
            }
         }
      }
   });

   it('should name the back link and the menu link in the header messages', () => {
      for (const header of [cs.Header, en.Header]) {
         expect(header.backToHome).toBeTruthy();
         expect(header.privacy).toBeTruthy();
      }
   });
});
