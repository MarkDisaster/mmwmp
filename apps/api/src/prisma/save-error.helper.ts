import {
   ConflictException,
   HttpException,
   type HttpExceptionOptions,
   HttpStatus,
   Logger,
   NotFoundException,
} from '@nestjs/common';

import { ApiErrorCode } from '@/common/enum/api-error-code.enum';
import { Prisma } from '@/generated/prisma/client';

type UniqueTaken = {
   field: string;
   message: string;
   code?: ApiErrorCode;
};

export type SaveErrorMessages = {
   uniqueTaken?: UniqueTaken;
   referenceMissing: string;
};

export const CONCURRENT_CHANGE_MESSAGE =
   'The data was changed by another request at the same time. Reload it and try again';
export const BUSY_MESSAGE = 'Another change of the same data is in progress. Try again';

export const saveConflict = (
   message: string,
   code: ApiErrorCode,
   options?: HttpExceptionOptions,
): ConflictException =>
   new ConflictException(
      { statusCode: HttpStatus.CONFLICT, message, error: 'Conflict', code },
      options,
   );

type DatabaseFailure = { sqlState?: string; fields: string[] };

type DriverAdapterCause = {
   kind?: string;
   originalCode?: string;
   code?: string;
   constraint?: { fields?: string[]; index?: string };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
   typeof value === 'object' && value !== null;

const adapterCause = (error: unknown): DriverAdapterCause | undefined => {
   if (!isRecord(error)) return undefined;
   if (error.name === 'DriverAdapterError' && isRecord(error.cause)) {
      return error.cause as DriverAdapterCause;
   }
   const meta = (error as { meta?: unknown }).meta;
   if (isRecord(meta) && isRecord(meta.driverAdapterError)) {
      return adapterCause(meta.driverAdapterError);
   }
   return undefined;
};

const PRISMA_CODE_TO_SQLSTATE: Record<string, string> = {
   P2002: '23505',
   P2003: '23503',
   P2034: '40001',
};

export const describeDatabaseError = (error: unknown): DatabaseFailure | undefined => {
   const cause = adapterCause(error);
   const constraint = cause?.constraint;
   const fields = [...(constraint?.fields ?? []), ...(constraint?.index ? [constraint.index] : [])];

   if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const target = error.meta?.target;
      if (Array.isArray(target)) fields.push(...target.map(String));
      else if (typeof target === 'string') fields.push(target);
      return {
         sqlState: cause?.originalCode ?? PRISMA_CODE_TO_SQLSTATE[error.code],
         fields,
      };
   }
   if (cause) return { sqlState: cause.originalCode ?? cause.code, fields };
   return undefined;
};

const logger = new Logger('SaveErrors');

const logMapped = (code: string, fields: string[], answer: number) => {
   const on = fields.length > 0 ? ` on ${fields.join(', ')}` : '';
   logger.warn(`Save failed with ${code}${on}, answered with ${answer}`);
};

const TRANSACTION_API_ERROR = 'P2028';

export const toBusyHttpError = (error: unknown): unknown => {
   if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === TRANSACTION_API_ERROR
   ) {
      logMapped(TRANSACTION_API_ERROR, [], 409);
      return saveConflict(BUSY_MESSAGE, ApiErrorCode.BUSY, { cause: error });
   }
   return error;
};

export const toSaveHttpError = (error: unknown, messages: SaveErrorMessages): unknown => {
   if (error instanceof HttpException) return error;
   const busy = toBusyHttpError(error);
   if (busy !== error) return busy;
   const cause = { cause: error };
   const failure = describeDatabaseError(error);
   const taken = messages.uniqueTaken;
   switch (failure?.sqlState) {
      case '23505':
         if (taken && failure.fields.some((field) => field.includes(taken.field))) {
            return taken.code
               ? saveConflict(taken.message, taken.code, cause)
               : new ConflictException(taken.message, { cause: error, description: 'Conflict' });
         }
         logMapped(failure.sqlState, failure.fields, 409);
         return saveConflict(CONCURRENT_CHANGE_MESSAGE, ApiErrorCode.CONCURRENT_CHANGE, cause);
      case '23503':
         logMapped(failure.sqlState, failure.fields, 404);
         return new NotFoundException(messages.referenceMissing, cause);
      case '40001':
      case '40P01':
      case '55P03':
         logMapped(failure.sqlState, failure.fields, 409);
         return saveConflict(BUSY_MESSAGE, ApiErrorCode.BUSY, cause);
      default:
         return error;
   }
};

export const withSaveErrors = async <T>(
   save: () => Promise<T>,
   messages: SaveErrorMessages,
): Promise<T> => {
   try {
      return await save();
   } catch (error) {
      throw toSaveHttpError(error, messages);
   }
};
