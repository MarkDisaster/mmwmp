import { type Request, request } from 'express';

import { Language } from '@/generated/prisma/enums';

import { getAcceptedLanguage } from '../accept-language.decorator';

const withHeader = (header?: string): Request =>
   Object.assign(Object.create(request) as Request, {
      headers: header === undefined ? {} : { 'accept-language': header },
   });

describe('getAcceptedLanguage', () => {
   it('picks the language by its q weight, not by its position', () => {
      expect(getAcceptedLanguage(withHeader('en;q=0.1, cs;q=0.9'))).toBe(Language.cs);
      expect(getAcceptedLanguage(withHeader('cs;q=0.2, en'))).toBe(Language.en);
   });

   it('matches a regional tag to its language, in any case', () => {
      expect(getAcceptedLanguage(withHeader('cs-CZ,cs;q=0.9,en;q=0.8'))).toBe(Language.cs);
      expect(getAcceptedLanguage(withHeader('EN-us'))).toBe(Language.en);
   });

   it('skips the languages the API does not have', () => {
      expect(getAcceptedLanguage(withHeader('de, en;q=0.5'))).toBe(Language.en);
      expect(getAcceptedLanguage(withHeader('de, fr'))).toBeUndefined();
   });

   it('refuses a language with q=0', () => {
      expect(getAcceptedLanguage(withHeader('en;q=0, cs;q=0.1'))).toBe(Language.cs);
   });

   it('asks for every translation when the header names no language', () => {
      expect(getAcceptedLanguage(withHeader())).toBeUndefined();
      expect(getAcceptedLanguage(withHeader(''))).toBeUndefined();
      expect(getAcceptedLanguage(withHeader('*'))).toBeUndefined();
   });
});
