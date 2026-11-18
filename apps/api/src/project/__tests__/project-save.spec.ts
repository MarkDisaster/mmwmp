import { BadRequestException } from '@nestjs/common';

import { Language } from '@/generated/prisma/enums';

import type { SaveProjectTranslationDto } from '../dto/save-project.dto';
import { assertYearRange, pickTranslations, planMedia } from '../project-save';

const translation = (language: Language, title: string): SaveProjectTranslationDto => ({
   language,
   title,
});

describe('planMedia', () => {
   it('keeps, adds and removes rows and numbers the whole list from 0', () => {
      const plan = planMedia(
         [{ id: 3 }, { fileId: 10, language: Language.en }, { id: 1 }, { fileId: 11 }],
         [1, 2, 3],
      );

      expect(plan).toEqual({
         removeIds: [2],
         keep: [
            { id: 3, sortOrder: 0 },
            { id: 1, sortOrder: 2 },
         ],
         create: [
            { fileId: 10, language: Language.en, sortOrder: 1 },
            { fileId: 11, language: null, sortOrder: 3 },
         ],
      });
   });

   it('adds the same file in the same language more than once', () => {
      const plan = planMedia(
         [
            { fileId: 5, language: Language.cs },
            { fileId: 5, language: Language.cs },
         ],
         [],
      );

      expect(plan.create).toEqual([
         { fileId: 5, language: Language.cs, sortOrder: 0 },
         { fileId: 5, language: Language.cs, sortOrder: 1 },
      ]);
   });

   it('removes every row for an empty list', () => {
      expect(planMedia([], [4, 5])).toEqual({ removeIds: [4, 5], keep: [], create: [] });
   });

   it.each([
      ['a row of another project', [{ id: 9 }], [1]],
      ['a row listed twice', [{ id: 1 }, { id: 1 }], [1]],
      ['an id together with a file', [{ id: 1, fileId: 2 }], [1]],
      ['an id together with a language', [{ id: 1, language: null }], [1]],
      ['an item without id and fileId', [{ language: Language.cs }], []],
   ])('rejects %s with 400', (_case, items, existing) => {
      expect(() => planMedia(items, existing)).toThrow(BadRequestException);
   });
});

describe('pickTranslations', () => {
   it('applies only the translations with a title', () => {
      const applied = pickTranslations([
         translation(Language.cs, 'Projekt'),
         translation(Language.en, '   '),
      ]);

      expect(applied.map((t) => t.language)).toEqual([Language.cs]);
   });

   it('rejects a form without any title', () => {
      expect(() => pickTranslations([translation(Language.cs, '')])).toThrow(
         'At least one translation needs a title',
      );
   });

   it('rejects a language listed twice, even with an empty title', () => {
      expect(() =>
         pickTranslations([translation(Language.cs, 'A'), translation(Language.cs, '')]),
      ).toThrow(BadRequestException);
   });
});

describe('assertYearRange', () => {
   it.each([
      [null, null],
      [2020, null],
      [2020, 2020],
      [2020, 2024],
   ])('accepts %p to %p', (start, end) => {
      expect(() => assertYearRange(start, end)).not.toThrow();
   });

   it.each([
      [2024, 2020],
      [null, 2020],
   ])('rejects %p to %p', (start, end) => {
      expect(() => assertYearRange(start, end)).toThrow(BadRequestException);
   });

   it('accepts a running project with a start year and no end year', () => {
      expect(() => assertYearRange(2020, null, true)).not.toThrow();
   });

   it('rejects a running project without a start year', () => {
      expect(() => assertYearRange(null, null, true)).toThrow('ongoing requires startYear');
   });

   it('rejects a running project with an end year', () => {
      expect(() => assertYearRange(2020, 2024, true)).toThrow(
         'ongoing project must not have endYear (send endYear: null, or ongoing: false)',
      );
   });

   it('accepts an end year when the project is not running', () => {
      expect(() => assertYearRange(2020, 2024, false)).not.toThrow();
   });
});
