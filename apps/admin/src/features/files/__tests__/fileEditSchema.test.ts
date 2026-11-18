import { describe, expect, it } from 'vitest';

import { updateFileDtoLanguageEnum } from '@/api/generated';

import {
   fileEditSchema,
   MAX_ALT_TEXT_LENGTH,
   MAX_DISPLAY_NAME_LENGTH,
} from '../validation/fileEditSchema';

const values = (overrides: Partial<Record<string, unknown>> = {}) => ({
   displayName: 'Logo',
   altText: '',
   language: null,
   ...overrides,
});

describe('fileEditSchema', () => {
   it('should trim the name and the alt text', () => {
      const parsed = fileEditSchema.parse(values({ displayName: '  Logo  ', altText: ' A car ' }));

      expect(parsed).toMatchObject({ displayName: 'Logo', altText: 'A car' });
   });

   it('should accept a name at the limit of the API, counted without the surrounding spaces', () => {
      expect(
         fileEditSchema.safeParse(
            values({ displayName: ` ${'a'.repeat(MAX_DISPLAY_NAME_LENGTH)} ` }),
         ).success,
      ).toBe(true);
   });

   it('should refuse a longer name', () => {
      const result = fileEditSchema.safeParse(
         values({ displayName: 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1) }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(['displayName']);
   });

   it('should accept an alt text at the limit of the API', () => {
      expect(
         fileEditSchema.safeParse(values({ altText: 'a'.repeat(MAX_ALT_TEXT_LENGTH) })).success,
      ).toBe(true);
   });

   it('should refuse a longer alt text', () => {
      const result = fileEditSchema.safeParse(
         values({ altText: 'a'.repeat(MAX_ALT_TEXT_LENGTH + 1) }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(['altText']);
   });

   it('should count the alt text without the surrounding spaces', () => {
      expect(
         fileEditSchema.safeParse(values({ altText: ` ${'a'.repeat(MAX_ALT_TEXT_LENGTH)} ` }))
            .success,
      ).toBe(true);
   });

   it.each([null, ...Object.values(updateFileDtoLanguageEnum)])(
      'should accept the language %s',
      (language) => {
         expect(fileEditSchema.safeParse(values({ language })).success).toBe(true);
      },
   );

   it('should refuse a language the API does not accept', () => {
      expect(fileEditSchema.safeParse(values({ language: 'de' })).success).toBe(false);
   });
});
