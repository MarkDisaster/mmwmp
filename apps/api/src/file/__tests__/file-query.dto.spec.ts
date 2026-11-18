import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { FileQueryDto } from '../dto/file-query.dto';

const prefixErrors = async (mimeTypePrefix: unknown) => {
   const dto = plainToInstance(FileQueryDto, { mimeTypePrefix });
   const errors = await validate(dto);
   return errors.filter((error) => error.property === 'mimeTypePrefix');
};

describe('FileQueryDto', () => {
   it.each([
      'image/',
      'image/png',
      'image/svg+xml',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/x-7z-compressed',
      'video/',
   ])('accepts the prefix %s', async (prefix) => {
      expect(await prefixErrors(prefix)).toEqual([]);
   });

   it('accepts a query without a prefix', async () => {
      expect(await prefixErrors(undefined)).toEqual([]);
   });

   it.each([
      '',
      'image',
      'Image/',
      '%',
      'image/%',
      '%/png',
      'image/_ng',
      'image/*',
      '*/*',
      'image\\/',
      'image/ png',
      '/png',
      'image//',
      `image/${'a'.repeat(100)}`,
      ['image/', 'video/'],
      42,
   ])('refuses the prefix %p', async (prefix) => {
      expect(await prefixErrors(prefix)).not.toEqual([]);
   });

   it('keeps the pagination fields of the base query', async () => {
      const dto = plainToInstance(FileQueryDto, {
         page: '1',
         limit: '101',
         mimeTypePrefix: 'image/',
      });
      const errors = await validate(dto);

      expect(dto.page).toBe(1);
      expect(errors.map((error) => error.property)).toEqual(['limit']);
   });
});
