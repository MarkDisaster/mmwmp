import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { MAX_ABOUT_TITLE_LENGTH } from '../contact.constants';
import { UpsertContactTranslationDto } from '../dto/upsert-contact-translation.dto';

const check = (body: Record<string, unknown>) => {
   const dto = plainToInstance(UpsertContactTranslationDto, { language: 'cs', ...body });
   return validate(dto).then((errors) => ({ dto, errors }));
};

describe('UpsertContactTranslationDto aboutTitle', () => {
   it('should accept a missing heading', async () => {
      const { errors } = await check({});
      expect(errors).toHaveLength(0);
   });

   it('should accept null and an empty string (both clear the heading)', async () => {
      expect((await check({ aboutTitle: null })).errors).toHaveLength(0);
      expect((await check({ aboutTitle: '' })).errors).toHaveLength(0);
   });

   it('should trim the heading', async () => {
      const { dto, errors } = await check({ aboutTitle: '  Kdo jsem  ' });
      expect(errors).toHaveLength(0);
      expect(dto.aboutTitle).toBe('Kdo jsem');
   });

   it('should accept the maximum length and reject a longer heading', async () => {
      expect((await check({ aboutTitle: 'a'.repeat(MAX_ABOUT_TITLE_LENGTH) })).errors).toHaveLength(
         0,
      );
      const { errors } = await check({ aboutTitle: 'a'.repeat(MAX_ABOUT_TITLE_LENGTH + 1) });
      expect(errors.map((e) => e.property)).toEqual(['aboutTitle']);
   });

   it('should reject a non-string heading', async () => {
      const { errors } = await check({ aboutTitle: 5 });
      expect(errors.map((e) => e.property)).toEqual(['aboutTitle']);
   });
});
