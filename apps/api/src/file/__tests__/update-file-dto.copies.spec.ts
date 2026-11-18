import { readFileSync } from 'fs';
import { join } from 'path';

import { Language } from '@/generated/prisma/enums';

import { MAX_ALT_TEXT_LENGTH } from '../file.constants';

const ADMIN_API = join(__dirname, '../../../../admin/src/api');

type JsonSchema = { properties?: Record<string, { maxLength?: number; enum?: string[] }> };

const COPIES: [string, (json: unknown) => JsonSchema | undefined][] = [
   [
      'schema.json',
      (json) =>
         (json as { components?: { schemas?: Record<string, JsonSchema> } }).components?.schemas
            ?.UpdateFileDto,
   ],
   ['generated/schemas/updateFileDto.json', (json) => json as JsonSchema],
];

const readUpdateFileDto = (file: string, pick: (json: unknown) => JsonSchema | undefined) => {
   const path = join(ADMIN_API, file);
   const properties = pick(JSON.parse(readFileSync(path, 'utf8')))?.properties;
   if (properties === undefined) throw new Error(`No UpdateFileDto in ${path}`);
   return properties;
};

describe.each(COPIES)('UpdateFileDto in the admin %s', (file, pick) => {
   it('should have the alt text limit of the API', () => {
      expect(readUpdateFileDto(file, pick).altText?.maxLength).toBe(MAX_ALT_TEXT_LENGTH);
   });

   it('should have the content languages of the API', () => {
      expect(readUpdateFileDto(file, pick).language?.enum?.sort()).toEqual(
         Object.values(Language).sort(),
      );
   });
});
