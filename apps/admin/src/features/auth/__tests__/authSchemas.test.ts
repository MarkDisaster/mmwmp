import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import apiSchema from '@/api/schema.json';
import csLocale from '@/i18n/locales/cs.json';
import enLocale from '@/i18n/locales/en.json';

import { acceptInvitationSchema, resetPasswordSchema } from '../validation/authSchemas';

const mismatchedReset = { newPassword: 'secret123', confirmPassword: 'other1234' };

beforeAll(async () => {
   await i18next.init({
      lng: 'en',
      resources: { cs: { translation: csLocale }, en: { translation: enLocale } },
      showSupportNotice: false,
   });
});

describe('resetPasswordSchema', () => {
   it('should accept matching passwords', () => {
      expect(
         resetPasswordSchema.safeParse({ newPassword: 'secret123', confirmPassword: 'secret123' })
            .success,
      ).toBe(true);
   });

   it('should report a mismatch on confirmPassword', async () => {
      await i18next.changeLanguage('en');

      expect(resetPasswordSchema.safeParse(mismatchedReset).error?.issues).toEqual([
         expect.objectContaining({ message: 'Passwords do not match', path: ['confirmPassword'] }),
      ]);
   });

   it('should translate the mismatch into the language active at validation time', async () => {
      await i18next.changeLanguage('cs');

      expect(resetPasswordSchema.safeParse(mismatchedReset).error?.issues[0]?.message).toBe(
         'Hesla se neshodují',
      );
   });
});

describe('acceptInvitationSchema', () => {
   it('should report a mismatch on confirmPassword', async () => {
      await i18next.changeLanguage('en');
      const result = acceptInvitationSchema.safeParse({
         firstName: 'Jan',
         lastName: 'Novák',
         password: 'secret123',
         confirmPassword: 'other1234',
      });

      expect(result.error?.issues).toEqual([
         expect.objectContaining({ message: 'Passwords do not match', path: ['confirmPassword'] }),
      ]);
   });
});

describe('password limits of the API', () => {
   const { ResetPasswordDto, AcceptInvitationDto } = apiSchema.components.schemas;

   it.each([
      [
         'resetPasswordSchema',
         resetPasswordSchema.shape.newPassword,
         ResetPasswordDto.properties.newPassword,
      ],
      [
         'acceptInvitationSchema',
         acceptInvitationSchema.shape.password,
         AcceptInvitationDto.properties.password,
      ],
   ])(
      '%s should accept the shortest password the API accepts and reject a shorter one',
      (_, password, dto) => {
         expect(password.safeParse('x'.repeat(dto.minLength)).success).toBe(true);
         expect(password.safeParse('x'.repeat(dto.minLength - 1)).success).toBe(false);
      },
   );
});
