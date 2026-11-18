import { describe, expect, it } from 'vitest';

import apiSchema from '@/api/schema.json';

import { tagSchema } from '../validation/tagSchema';

describe('tagSchema limits of the API', () => {
   it('should accept the longest name the API accepts and reject a longer one', () => {
      const max = apiSchema.components.schemas.TagTranslationDto.properties.name.maxLength;
      const name = tagSchema.shape.translations.element.shape.name;

      expect(name.safeParse('x'.repeat(max)).success).toBe(true);
      expect(name.safeParse('x'.repeat(max + 1)).success).toBe(false);
   });
});
