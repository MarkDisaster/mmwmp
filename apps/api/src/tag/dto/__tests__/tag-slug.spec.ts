import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SLUG_MESSAGE } from '@/common/schema/slug';

import { CreateTagDto } from '../create-tag.dto';
import { UpdateTagDto } from '../update-tag.dto';

const translations = [{ language: 'cs', name: 'Web' }];

const slugErrors = async (dto: object) =>
   (await validate(dto, { whitelist: true })).filter((error) => error.property === 'slug');

describe('tag slug', () => {
   it.each(['web', 'my-tag-2'])('accepts "%s"', async (slug) => {
      const dto = plainToInstance(CreateTagDto, { slug, translations });
      expect(await slugErrors(dto)).toHaveLength(0);
   });

   it.each(['Web', 'my tag', 'a--b', '-a', 'a/b', 'tag!'])(
      'rejects "%s" on create',
      async (slug) => {
         const dto = plainToInstance(CreateTagDto, { slug, translations });
         expect(await slugErrors(dto)).toHaveLength(1);
      },
   );

   it('answers a slug outside the rule with the shared message', async () => {
      const [error] = await slugErrors(
         plainToInstance(CreateTagDto, { slug: 'Bad', translations }),
      );
      expect(SLUG_MESSAGE).toBe('Slug must be lowercase alphanumeric with hyphens');
      expect(Object.values(error?.constraints ?? {})).toEqual([SLUG_MESSAGE]);
   });

   it('does not reject a slug on the update DTO (the service checks a changed one)', async () => {
      expect(await slugErrors(plainToInstance(UpdateTagDto, { slug: 'Old Slug' }))).toHaveLength(0);
   });
});
