import {
   BadRequestException,
   ConflictException,
   type HttpException,
   Logger,
   NotFoundException,
} from '@nestjs/common';

import { ApiErrorCode } from '@/common/enum/api-error-code.enum';
import { Prisma } from '@/generated/prisma/client';
import { USER_SAVE_ERRORS } from '@/role/role-privilege';

import {
   BUSY_MESSAGE,
   CONCURRENT_CHANGE_MESSAGE,
   saveConflict,
   type SaveErrorMessages,
   toSaveHttpError,
   withSaveErrors,
} from '../save-error.helper';

const MESSAGES: SaveErrorMessages = {
   uniqueTaken: { field: 'slug', message: 'slug taken', code: ApiErrorCode.SLUG_TAKEN },
   referenceMissing: 'reference missing',
};

const adapterError = (cause: Record<string, unknown>) =>
   Object.assign(new Error(String(cause.kind)), { name: 'DriverAdapterError', cause });

const knownError = (code: string, meta?: Record<string, unknown>) =>
   new Prisma.PrismaClientKnownRequestError('failed', { code, clientVersion: 'test', meta });

let warn: jest.SpyInstance;
beforeEach(() => {
   warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterEach(() => warn.mockRestore());

describe('toSaveHttpError', () => {
   const messageOf = (error: unknown) => (toSaveHttpError(error, MESSAGES) as Error).message;

   it('answers the slug unique violation with the slug message', () => {
      const error = knownError('P2002', {
         driverAdapterError: adapterError({
            kind: 'UniqueConstraintViolation',
            originalCode: '23505',
            constraint: { fields: ['slug'] },
         }),
      });
      expect(toSaveHttpError(error, MESSAGES)).toBeInstanceOf(ConflictException);
      expect(messageOf(error)).toBe('slug taken');
   });

   it('also reads the columns from meta.target (the engine without a driver adapter)', () => {
      expect(messageOf(knownError('P2002', { target: ['slug'] }))).toBe('slug taken');
   });

   it('answers any other unique violation with the generic conflict', () => {
      const error = knownError('P2002', {
         driverAdapterError: adapterError({
            kind: 'UniqueConstraintViolation',
            originalCode: '23505',
            constraint: { fields: ['project_id', 'tag_id'] },
         }),
      });
      expect(messageOf(error)).toBe(CONCURRENT_CHANGE_MESSAGE);
      expect(messageOf(knownError('P2002'))).toBe(CONCURRENT_CHANGE_MESSAGE);
   });

   describe('a unique value the user chose, other than a slug', () => {
      const uniqueViolation = (fields: string[], index?: string) =>
         knownError('P2002', {
            driverAdapterError: adapterError({
               kind: 'UniqueConstraintViolation',
               originalCode: '23505',
               constraint: { fields, index },
            }),
         });

      it('answers a taken e-mail of a user like the e-mail check: its message, no code', () => {
         const mapped = toSaveHttpError(uniqueViolation(['email']), USER_SAVE_ERRORS);
         expect(mapped).toBeInstanceOf(ConflictException);
         expect((mapped as HttpException).getResponse()).toEqual({
            statusCode: 409,
            message: 'User with this email already exists',
            error: 'Conflict',
         });
      });

      it('matches the column in the index name as well', () => {
         const roleName: SaveErrorMessages = {
            uniqueTaken: { field: 'name', message: 'Role with this name already exists' },
            referenceMissing: 'Role not found',
         };
         const mapped = toSaveHttpError(uniqueViolation([], 'roles_name_key'), roleName);
         expect((mapped as Error).message).toBe('Role with this name already exists');
      });

      it('answers every unique violation of a save without such a value as a concurrent change', () => {
         const mapped = toSaveHttpError(uniqueViolation(['slug']), {
            referenceMissing: 'reference missing',
         });
         expect((mapped as HttpException).getResponse()).toMatchObject({
            message: CONCURRENT_CHANGE_MESSAGE,
            code: ApiErrorCode.CONCURRENT_CHANGE,
         });
      });
   });

   it('answers a foreign key violation with the 404 of the save', () => {
      const mapped = toSaveHttpError(knownError('P2003'), MESSAGES);
      expect(mapped).toBeInstanceOf(NotFoundException);
      expect((mapped as Error).message).toBe('reference missing');
   });

   it.each(['40P01', '55P03'])('answers %s raised by a model query with 409 try again', (code) => {
      const error = adapterError({ kind: 'postgres', code, originalCode: code });
      expect(toSaveHttpError(error, MESSAGES)).toBeInstanceOf(ConflictException);
      expect(messageOf(error)).toBe(BUSY_MESSAGE);
   });

   it('answers a lock timeout of a raw query (P2010) with 409 try again', () => {
      const error = knownError('P2010', {
         driverAdapterError: adapterError({
            kind: 'postgres',
            code: '55P03',
            originalCode: '55P03',
         }),
      });
      expect(messageOf(error)).toBe(BUSY_MESSAGE);
   });

   it('passes HTTP errors and unknown errors through', () => {
      const http = new BadRequestException('bad');
      const other = new Error('boom');
      expect(toSaveHttpError(http, MESSAGES)).toBe(http);
      expect(toSaveHttpError(other, MESSAGES)).toBe(other);
      expect(toSaveHttpError(knownError('P2025'), MESSAGES)).toBeInstanceOf(
         Prisma.PrismaClientKnownRequestError,
      );
   });
});

describe('toSaveHttpError — P2028', () => {
   it('answers a transaction that could not start or ran out of time with 409 try again', () => {
      const error = knownError('P2028');
      const mapped = toSaveHttpError(error, MESSAGES);
      expect(mapped).toBeInstanceOf(ConflictException);
      expect((mapped as Error).message).toBe(BUSY_MESSAGE);
   });
});

describe('toSaveHttpError — cause and log', () => {
   const uniqueOn = (fields: string[]) =>
      knownError('P2002', {
         driverAdapterError: adapterError({
            kind: 'UniqueConstraintViolation',
            originalCode: '23505',
            constraint: { fields },
         }),
      });

   it.each([
      ['a unique violation other than the slug', uniqueOn(['project_id', 'tag_id']), '23505'],
      ['a foreign key violation', knownError('P2003'), '23503'],
      [
         'a deadlock',
         adapterError({ kind: 'postgres', code: '40P01', originalCode: '40P01' }),
         '40P01',
      ],
      [
         'a lock timeout',
         adapterError({ kind: 'postgres', code: '55P03', originalCode: '55P03' }),
         '55P03',
      ],
      ['a busy pool', knownError('P2028'), 'P2028'],
   ])('keeps %s as the cause and logs its code', (_case, error, code) => {
      const mapped = toSaveHttpError(error, MESSAGES) as Error;

      expect(mapped.cause).toBe(error);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain(code);
   });

   it('logs the constrained columns but no value of the request', () => {
      const error = knownError('P2002', {
         driverAdapterError: adapterError({
            kind: 'UniqueConstraintViolation',
            originalCode: '23505',
            constraint: { fields: ['project_id', 'tag_id'] },
         }),
      });
      error.message = 'Unique constraint failed: Key (project_id, tag_id)=(7, 9) already exists';

      toSaveHttpError(error, MESSAGES);

      const line = String(warn.mock.calls[0][0]);
      expect(line).toContain('project_id, tag_id');
      expect(line).not.toContain('(7, 9)');
   });

   it('keeps the cause of a taken slug without logging it (an expected answer)', () => {
      const error = uniqueOn(['slug']);
      expect((toSaveHttpError(error, MESSAGES) as Error).cause).toBe(error);
      expect(warn).not.toHaveBeenCalled();
   });
});

describe('toSaveHttpError — code of the 409', () => {
   const bodyOf = (error: unknown) =>
      (toSaveHttpError(error, MESSAGES) as HttpException).getResponse();

   it('sends SLUG_TAKEN with the slug message and the usual fields of the body', () => {
      expect(bodyOf(knownError('P2002', { target: ['slug'] }))).toEqual({
         statusCode: 409,
         message: 'slug taken',
         error: 'Conflict',
         code: ApiErrorCode.SLUG_TAKEN,
      });
   });

   it('sends CONCURRENT_CHANGE for another unique violation', () => {
      expect(bodyOf(knownError('P2002', { target: ['project_id', 'tag_id'] }))).toMatchObject({
         message: CONCURRENT_CHANGE_MESSAGE,
         code: ApiErrorCode.CONCURRENT_CHANGE,
      });
   });

   it.each([
      ['a lock timeout', adapterError({ kind: 'postgres', code: '55P03', originalCode: '55P03' })],
      ['a deadlock', adapterError({ kind: 'postgres', code: '40P01', originalCode: '40P01' })],
      ['a busy pool', knownError('P2028')],
   ])('sends BUSY for %s', (_case, error) => {
      expect(bodyOf(error)).toMatchObject({ message: BUSY_MESSAGE, code: ApiErrorCode.BUSY });
   });
});

describe('saveConflict', () => {
   it('is a ConflictException with the message, the code and the cause', () => {
      const cause = new Error('db');
      const conflict = saveConflict('taken', ApiErrorCode.SLUG_TAKEN, { cause });

      expect(conflict).toBeInstanceOf(ConflictException);
      expect(conflict.getStatus()).toBe(409);
      expect(conflict.message).toBe('taken');
      expect(conflict.cause).toBe(cause);
      expect(conflict.getResponse()).toEqual({
         statusCode: 409,
         message: 'taken',
         error: 'Conflict',
         code: ApiErrorCode.SLUG_TAKEN,
      });
   });
});

describe('withSaveErrors', () => {
   it('returns the result of the save', async () => {
      await expect(withSaveErrors(() => Promise.resolve(7), MESSAGES)).resolves.toBe(7);
   });

   it('throws the mapped error', async () => {
      await expect(
         withSaveErrors(() => Promise.reject(knownError('P2003')), MESSAGES),
      ).rejects.toBeInstanceOf(NotFoundException);
   });
});
