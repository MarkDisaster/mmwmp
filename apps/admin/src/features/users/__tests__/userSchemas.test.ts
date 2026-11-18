import { describe, expect, it } from 'vitest';
import type { z } from 'zod/v4';

import apiSchema from '@/api/schema.json';

import {
   createUserSchema,
   editUserSchema,
   inviteSchema,
   passwordSchema,
   profileSchema,
} from '../validation/userSchemas';

const EMAIL = 'user@example.com';
const USER = { email: EMAIL, firstName: 'Jan', lastName: 'Novák' };

const isValid = (schema: z.ZodType, value: unknown) => schema.safeParse(value).success;

describe('createUserSchema', () => {
   it('should accept a complete user and turn the selected role id into a number', () => {
      const result = createUserSchema.safeParse({ ...USER, password: '12345678', roleId: '3' });

      expect(result.success).toBe(true);
      expect(result.data?.roleId).toBe(3);
   });

   it('should require a password of at least 8 characters', () => {
      expect(isValid(createUserSchema, { ...USER, password: '', roleId: '3' })).toBe(false);
      expect(isValid(createUserSchema, { ...USER, password: '1234567', roleId: '3' })).toBe(false);
   });

   it('should require a selected role', () => {
      expect(isValid(createUserSchema, { ...USER, password: '12345678', roleId: undefined })).toBe(
         false,
      );
   });
});

describe('editUserSchema', () => {
   it('should not carry a password: the admin edit cannot set one', () => {
      const result = editUserSchema.safeParse({ ...USER, password: 'secret123', roleId: '2' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ ...USER, roleId: 2 });
   });

   it('should require a first and last name', () => {
      expect(isValid(editUserSchema, { ...USER, firstName: '', roleId: 2 })).toBe(false);
   });
});

describe('inviteSchema', () => {
   it('should require a valid e-mail and a role', () => {
      expect(isValid(inviteSchema, { email: EMAIL, roleId: '1' })).toBe(true);
      expect(isValid(inviteSchema, { email: 'user', roleId: '1' })).toBe(false);
      expect(isValid(inviteSchema, { email: EMAIL, roleId: '' })).toBe(false);
   });
});

describe('profileSchema', () => {
   it('should require both names', () => {
      expect(isValid(profileSchema, { firstName: 'Jan', lastName: '' })).toBe(false);
      expect(isValid(profileSchema, { firstName: 'Jan', lastName: 'Novák' })).toBe(true);
   });
});

describe('passwordSchema', () => {
   it('should require the current password and a new one of at least 8 characters', () => {
      expect(isValid(passwordSchema, { currentPassword: '', newPassword: '12345678' })).toBe(false);
      expect(isValid(passwordSchema, { currentPassword: 'x', newPassword: '1234567' })).toBe(false);
      expect(isValid(passwordSchema, { currentPassword: 'x', newPassword: '12345678' })).toBe(true);
   });
});

describe('password limits of the API', () => {
   const { CreateUserDto, ChangePasswordDto } = apiSchema.components.schemas;

   it.each([
      ['createUserSchema', createUserSchema.shape.password, CreateUserDto.properties.password],
      [
         'passwordSchema',
         passwordSchema.shape.newPassword,
         ChangePasswordDto.properties.newPassword,
      ],
   ])(
      '%s should accept the shortest password the API accepts and reject a shorter one',
      (_, password, dto) => {
         expect(password.safeParse('x'.repeat(dto.minLength)).success).toBe(true);
         expect(password.safeParse('x'.repeat(dto.minLength - 1)).success).toBe(false);
      },
   );
});
