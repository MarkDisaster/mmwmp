import { type ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AuthLoginDto } from '@/auth/dto/auth-login.dto';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { AdminUpdateUserDto } from '@/user/dto/admin-update-user.dto';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UserInvitationDto } from '@/user/dto/user-invitation.dto';

import { normalizeEmail } from '../normalize-email.decorator';

describe('normalizeEmail', () => {
   it.each([
      ['Jan.Novak@Firma.CZ', 'jan.novak@firma.cz'],
      ['  jan@firma.cz\t', 'jan@firma.cz'],
      ['jan@firma.cz', 'jan@firma.cz'],
   ])('should turn %p into %p', (input, expected) => {
      expect(normalizeEmail(input)).toBe(expected);
   });

   it('should be idempotent', () => {
      const once = normalizeEmail(' Jan@Firma.cz ');
      expect(normalizeEmail(once)).toBe(once);
   });
});

// global `ValidationPipe({ transform: true })` does.
describe('@NormalizeEmail on the DTOs', () => {
   const PASSWORD = 'password123';
   type EmailDto = { email?: string };
   const cases: [string, ClassConstructor<EmailDto>, Record<string, unknown>][] = [
      ['AuthLoginDto', AuthLoginDto, { password: PASSWORD }],
      ['ForgotPasswordDto', ForgotPasswordDto, {}],
      ['UserInvitationDto', UserInvitationDto, { roleId: 2 }],
      [
         'CreateUserDto',
         CreateUserDto,
         { firstName: 'Jan', lastName: 'Novák', password: PASSWORD, roleId: 2 },
      ],
      ['AdminUpdateUserDto', AdminUpdateUserDto, {}],
   ];

   it.each(cases)('%s normalizes the email before it is validated', async (_name, Dto, rest) => {
      const dto = plainToInstance(Dto, { ...rest, email: '  Jan.Novak@Firma.CZ ' });

      expect(dto.email).toBe('jan.novak@firma.cz');
      expect(await validate(dto)).toEqual([]);
   });

   it('should leave a value that is not a string to the validation', async () => {
      const dto = plainToInstance(ForgotPasswordDto, { email: 42 });

      expect(dto.email).toBe(42);
      expect(await validate(dto)).not.toEqual([]);
   });

   it('should refuse a null email of AdminUpdateUserDto and accept a missing one', async () => {
      expect(await validate(plainToInstance(AdminUpdateUserDto, { email: null }))).not.toEqual([]);
      expect(await validate(plainToInstance(AdminUpdateUserDto, {}))).toEqual([]);
   });
});
