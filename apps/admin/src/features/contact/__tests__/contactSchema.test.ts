import { describe, expect, it } from 'vitest';

import { ABOUT_TITLE_MAX_LENGTH } from '../constants';
import { type ContactFormInput, upsertContactSchema } from '../validation/contactSchema';

const EMPTY_FORM: ContactFormInput = {
   companyName: null,
   phone: null,
   email: null,
   street: null,
   zip: null,
   city: null,
   ico: null,
   vatPayer: false,
   linkedinUrl: null,
   githubUrl: null,
   translations: [
      { language: 'cs', description: null, aboutTitle: null },
      { language: 'en', description: null, aboutTitle: null },
   ],
};

const parse = (values: Partial<ContactFormInput>) =>
   upsertContactSchema.safeParse({ ...EMPTY_FORM, ...values });

describe('upsertContactSchema', () => {
   it('should accept a cleared e-mail and URL and store them as null', () => {
      const result = parse({ email: '', linkedinUrl: '', githubUrl: '   ' });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ email: null, linkedinUrl: null, githubUrl: null });
   });

   it('should store cleared and unset text fields as null instead of an empty string', () => {
      const result = parse({
         companyName: '',
         phone: '',
         street: '  ',
         zip: undefined,
         translations: [
            { language: 'cs', description: '' },
            { language: 'en', description: undefined },
         ],
      });

      expect(result.data).toMatchObject({
         companyName: null,
         phone: null,
         street: null,
         zip: null,
         translations: [
            { language: 'cs', description: null },
            { language: 'en', description: null },
         ],
      });
   });

   it('should keep filled values as they are', () => {
      const result = parse({
         companyName: 'Firma s.r.o.',
         email: 'info@firma.cz',
         githubUrl: 'https://github.com/x',
      });

      expect(result.data).toMatchObject({
         companyName: 'Firma s.r.o.',
         email: 'info@firma.cz',
         githubUrl: 'https://github.com/x',
      });
   });

   it('should still reject a filled e-mail or URL in a wrong format', () => {
      expect(parse({ email: 'not-an-email' }).success).toBe(false);
      expect(parse({ linkedinUrl: 'linkedin.com/in/x' }).success).toBe(false);
   });

   describe('aboutTitle', () => {
      const withTitle = (aboutTitle: string | null | undefined) =>
         parse({ translations: [{ language: 'cs', description: null, aboutTitle }] });

      it('should keep a filled heading', () => {
         expect(withTitle('Kdo jsem').data?.translations[0].aboutTitle).toBe('Kdo jsem');
      });

      it.each(['', '   ', undefined, null])('should store %j as null', (value) => {
         expect(withTitle(value).data?.translations[0].aboutTitle).toBeNull();
      });

      it('should accept a heading of the maximum length and reject a longer one', () => {
         expect(withTitle('a'.repeat(ABOUT_TITLE_MAX_LENGTH)).success).toBe(true);
         expect(withTitle('a'.repeat(ABOUT_TITLE_MAX_LENGTH + 1)).success).toBe(false);
      });
   });

   it('should default vatPayer to false', () => {
      expect(parse({ vatPayer: undefined }).data?.vatPayer).toBe(false);
   });
});
