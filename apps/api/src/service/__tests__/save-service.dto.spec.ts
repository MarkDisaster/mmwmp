import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SaveServiceDto } from '../dto/save-service.dto';

const validBody = {
   slug: 'web-development',
   showOnHomepage: true,
   status: 'published',
   translations: [
      { language: 'cs', title: 'Vývoj webu', description: 'Popis', content: '<p>Obsah</p>' },
      { language: 'en', title: '' },
   ],
   projectIds: [3, 1, 2],
};

const errorsOf = async (body: Record<string, unknown>) =>
   validate(plainToInstance(SaveServiceDto, body));

const propertiesOf = async (body: Record<string, unknown>) =>
   (await errorsOf(body)).map((error) => error.property);

describe('SaveServiceDto', () => {
   it('accepts the whole editor state, an empty title included', async () => {
      expect(await errorsOf(validBody)).toEqual([]);
   });

   it('accepts a body without a status (keeps the current one)', async () => {
      expect(await errorsOf({ ...validBody, status: undefined })).toEqual([]);
   });

   it('accepts null description and content', async () => {
      const body = {
         ...validBody,
         translations: [{ language: 'cs', title: 'A', description: null, content: null }],
      };
      expect(await errorsOf(body)).toEqual([]);
   });

   it('refuses the same language twice', async () => {
      const body = {
         ...validBody,
         translations: [
            { language: 'cs', title: 'A' },
            { language: 'cs', title: 'B' },
         ],
      };
      expect(await propertiesOf(body)).toEqual(['translations']);
   });

   it('refuses an unknown language inside a translation', async () => {
      const body = { ...validBody, translations: [{ language: 'de', title: 'A' }] };
      expect(await propertiesOf(body)).toEqual(['translations']);
   });

   it('refuses a translation that is not an object without throwing', async () => {
      const body = { ...validBody, translations: [null, 'cs'] };
      expect(await propertiesOf(body)).toEqual(['translations']);
   });

   it('refuses an empty list of translations', async () => {
      expect(await propertiesOf({ ...validBody, translations: [] })).toEqual(['translations']);
   });

   it.each([
      ['slug', 'Not A Slug'],
      ['showOnHomepage', undefined],
      ['status', 'archived'],
      ['projectIds', [1, 0]],
      ['projectIds', ['1']],
      ['projectIds', undefined],
   ])('refuses %s = %p', async (property, value) => {
      expect(await propertiesOf({ ...validBody, [property]: value })).toEqual([property]);
   });

   it('limits the projects of one save', async () => {
      const many = (count: number) => Array.from({ length: count }, (_, index) => index + 1);
      expect(await propertiesOf({ ...validBody, projectIds: many(200) })).toEqual([]);
      expect(await propertiesOf({ ...validBody, projectIds: many(201) })).toEqual(['projectIds']);
   });
});
