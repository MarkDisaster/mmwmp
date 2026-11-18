import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateFileDto } from '../dto/update-file.dto';
import { MAX_ALT_TEXT_LENGTH, MAX_DISPLAY_NAME_LENGTH } from '../file.constants';

const parse = async (body: Record<string, unknown>) => {
   const dto = plainToInstance(UpdateFileDto, body);
   const errors = await validate(dto);
   return { dto, properties: errors.map((error) => error.property) };
};

describe('UpdateFileDto altText', () => {
   it('accepts text up to the limit, null and a missing key', async () => {
      expect((await parse({ altText: 'a'.repeat(MAX_ALT_TEXT_LENGTH) })).properties).toEqual([]);
      expect((await parse({ altText: null })).properties).toEqual([]);
      expect((await parse({})).properties).toEqual([]);
   });

   it('trims the text before it is measured', async () => {
      const { dto, properties } = await parse({
         altText: `  ${'a'.repeat(MAX_ALT_TEXT_LENGTH)}  `,
      });

      expect(properties).toEqual([]);
      expect(dto.altText).toHaveLength(MAX_ALT_TEXT_LENGTH);
   });

   it('refuses a longer text and a non-string', async () => {
      expect((await parse({ altText: 'a'.repeat(MAX_ALT_TEXT_LENGTH + 1) })).properties).toEqual([
         'altText',
      ]);
      expect((await parse({ altText: 1 })).properties).toEqual(['altText']);
   });
});

describe('UpdateFileDto displayName', () => {
   it('trims the name before it is measured', async () => {
      const { dto, properties } = await parse({
         displayName: `  ${'a'.repeat(MAX_DISPLAY_NAME_LENGTH)}  `,
      });

      expect(properties).toEqual([]);
      expect(dto.displayName).toHaveLength(MAX_DISPLAY_NAME_LENGTH);
   });

   it('refuses a longer name and a non-string', async () => {
      expect(
         (await parse({ displayName: 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1) })).properties,
      ).toEqual(['displayName']);
      expect((await parse({ displayName: ['a', 'b'] })).properties).toEqual(['displayName']);
   });
});
