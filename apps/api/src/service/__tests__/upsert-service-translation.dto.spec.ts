import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpsertServiceTranslationDto } from '../dto/upsert-service-translation.dto';

const invalidProperties = async (body: Record<string, unknown>) =>
   (await validate(plainToInstance(UpsertServiceTranslationDto, body))).map((e) => e.property);

describe('UpsertServiceTranslationDto SEO fields', () => {
   it('accepts text and missing keys', async () => {
      expect(await invalidProperties({ title: 'T', metaTitle: 'M', metaDescription: 'D' })).toEqual(
         [],
      );
      expect(await invalidProperties({ title: 'T' })).toEqual([]);
   });

   it('refuses null (a 400, not a 500 in the service) and non-strings', async () => {
      expect(await invalidProperties({ title: 'T', metaTitle: null })).toEqual(['metaTitle']);
      expect(await invalidProperties({ title: 'T', metaDescription: null })).toEqual([
         'metaDescription',
      ]);
      expect(await invalidProperties({ title: 'T', metaTitle: 1 })).toEqual(['metaTitle']);
   });
});
