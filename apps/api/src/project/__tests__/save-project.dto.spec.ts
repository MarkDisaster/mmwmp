import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SaveProjectDto } from '../dto/save-project.dto';

const VALID = {
   slug: 'my-project',
   thumbnailId: null,
   showOnHomepage: false,
   company: null,
   startYear: null,
   endYear: null,
   translations: [{ language: 'cs', title: 'Projekt' }],
   tagIds: [],
   links: [],
   media: [],
};

const errorsOf = async (body: Record<string, unknown>) => {
   const errors = await validate(plainToInstance(SaveProjectDto, body));
   return errors.map((error) => error.property);
};

describe('SaveProjectDto', () => {
   it('accepts the whole form with explicit nulls', async () => {
      expect(await errorsOf(VALID)).toEqual([]);
   });

   it('accepts values in every nullable field', async () => {
      expect(
         await errorsOf({
            ...VALID,
            thumbnailId: 1,
            company: 'ACME',
            startYear: 2020,
            endYear: 2024,
            status: 'published',
            links: [{ label: 'GitHub', url: 'https://github.com/example/repo' }],
            media: [{ id: 1 }, { fileId: 2, language: 'en' }, { fileId: 3, language: null }],
         }),
      ).toEqual([]);
   });

   it('accepts the flag ongoing and leaves it optional', async () => {
      expect(await errorsOf({ ...VALID, startYear: 2020, ongoing: true })).toEqual([]);
      expect(await errorsOf({ ...VALID, ongoing: false })).toEqual([]);
   });

   it('rejects an ongoing that is not a boolean', async () => {
      expect(await errorsOf({ ...VALID, ongoing: 'yes' })).toEqual(['ongoing']);
   });

   it.each(['thumbnailId', 'company', 'startYear', 'endYear', 'tagIds', 'links', 'media'])(
      'requires the key %s (a save replaces the whole state)',
      async (key) => {
         const body: Record<string, unknown> = { ...VALID };
         delete body[key];
         expect(await errorsOf(body)).toEqual([key]);
      },
   );

   it.each([
      ['slug', { slug: 'Not A Slug' }],
      ['startYear', { startYear: 1989 }],
      ['company', { company: 'x'.repeat(201) }],
      ['translations', { translations: [] }],
      ['translations', { translations: [{ language: 'de', title: 'Projekt' }] }],
      ['links', { links: [{ url: 'javascript:alert(1)' }] }],
      ['links', { links: Array.from({ length: 12 }, () => ({ url: 'https://example.com' })) }],
      ['media', { media: [{ fileId: 'one' }] }],
      ['status', { status: 'archived' }],
   ])('rejects an invalid %s', async (property, override) => {
      expect(await errorsOf({ ...VALID, ...override })).toEqual([property]);
   });

   it('limits the lists of one save', async () => {
      const many = (count: number) => Array.from({ length: count }, (_, index) => index + 1);
      expect(
         await errorsOf({
            ...VALID,
            tagIds: many(200),
            media: many(100).map((fileId) => ({ fileId })),
         }),
      ).toEqual([]);
      expect(
         await errorsOf({
            ...VALID,
            tagIds: many(201),
            media: many(101).map((fileId) => ({ fileId })),
         }),
      ).toEqual(['tagIds', 'media']);
   });
});
