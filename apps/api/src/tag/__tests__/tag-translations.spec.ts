import { type ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateTagDto } from '../dto/create-tag.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';
import { pickTagTranslations, tagName, toToolNames } from '../tag-translations';

const cs = { language: 'cs' as const, name: 'Případová studie' };
const en = { language: 'en' as const, name: 'Case study' };

describe('pickTagTranslations', () => {
   it('keeps both names, trimmed', () => {
      expect(pickTagTranslations([{ ...cs, name: ' Případová studie ' }, en])).toEqual([cs, en]);
   });

   it('drops an empty English name', () => {
      expect(pickTagTranslations([cs, { language: 'en', name: '   ' }])).toEqual([cs]);
   });

   it('requires a non-empty Czech name', () => {
      expect(() => pickTagTranslations([en])).toThrow('The Czech (cs) name of the tag is required');
      expect(() => pickTagTranslations([{ language: 'cs', name: ' ' }, en])).toThrow(
         'The Czech (cs) name of the tag is required',
      );
   });

   it('rejects a language listed twice', () => {
      expect(() => pickTagTranslations([cs, cs])).toThrow('Translation cs is listed twice');
   });
});

describe('tagName', () => {
   it('picks the language and falls back to Czech', () => {
      expect(tagName({ translations: [cs, en] }, 'en')).toBe('Case study');
      expect(tagName({ translations: [cs] }, 'en')).toBe('Případová studie');
      expect(tagName({ translations: [cs, en] })).toBe('Případová studie');
   });

   it('falls back to any translation, then to an empty name', () => {
      expect(tagName({ translations: [en] })).toBe('Case study');
      expect(tagName({ translations: [] })).toBe('');
   });
});

describe('toToolNames', () => {
   it('has null for a missing English name', () => {
      expect(toToolNames({ translations: [cs] })).toEqual({ cs: 'Případová studie', en: null });
   });
});

const errorsOf = async (Dto: ClassConstructor<CreateTagDto | UpdateTagDto>, body: object) =>
   (await validate(plainToInstance(Dto, body))).map((error) => error.property);

describe('CreateTagDto', () => {
   it('accepts Czech with an optional English name', async () => {
      expect(await errorsOf(CreateTagDto, { slug: 'a', translations: [cs] })).toEqual([]);
      expect(await errorsOf(CreateTagDto, { slug: 'a', translations: [cs, en] })).toEqual([]);
   });

   it('rejects missing, empty, duplicated, unknown-language and too long translations', async () => {
      expect(await errorsOf(CreateTagDto, { slug: 'a' })).toContain('translations');
      expect(await errorsOf(CreateTagDto, { slug: 'a', translations: [] })).toContain(
         'translations',
      );
      expect(await errorsOf(CreateTagDto, { slug: 'a', translations: [cs, cs] })).toContain(
         'translations',
      );
      expect(
         await errorsOf(CreateTagDto, { slug: 'a', translations: [{ language: 'de', name: 'x' }] }),
      ).toContain('translations');
      expect(
         await errorsOf(CreateTagDto, {
            slug: 'a',
            translations: [{ language: 'cs', name: 'x'.repeat(101) }],
         }),
      ).toContain('translations');
   });

   it('rejects the removed `name` field being the only name', async () => {
      expect(await errorsOf(CreateTagDto, { slug: 'a', name: 'Old' })).toContain('translations');
   });
});

describe('UpdateTagDto', () => {
   it('allows leaving the translations out and validates them when sent', async () => {
      expect(await errorsOf(UpdateTagDto, { color: '#fff' })).toEqual([]);
      expect(await errorsOf(UpdateTagDto, { translations: [cs, en] })).toEqual([]);
      expect(await errorsOf(UpdateTagDto, { translations: [] })).toContain('translations');
      expect(await errorsOf(UpdateTagDto, { translations: [cs, cs] })).toContain('translations');
   });
});
