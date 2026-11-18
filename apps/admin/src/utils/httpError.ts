import { isAxiosError } from 'axios';

import type { ApiErrorCode, ErrorResponseDto } from '@/api/generated';
import { apiErrorCodeEnum } from '@/api/generated/models/ApiErrorCode';

export const getHttpStatus = (error: unknown): number | undefined =>
   isAxiosError(error) ? error.response?.status : undefined;

export const isClientError = (error: unknown): boolean => {
   const status = getHttpStatus(error);
   return status !== undefined && status >= 400 && status < 500;
};

export const PUBLISHED_CONTENT_FORBIDDEN_MESSAGE =
   'Changing published content requires the publish permission';

const STATUS_MESSAGE_KEYS: Partial<Record<number, string>> = {
   413: 'common.httpError.payloadTooLarge',
   429: 'common.httpError.tooManyRequests',
};

export const getHttpStatusMessageKey = (status: number): string | undefined =>
   STATUS_MESSAGE_KEYS[status];

const getApiErrorMessage = (error: unknown): string | undefined => {
   if (!isAxiosError(error)) return undefined;
   const message: unknown = (error.response?.data as { message?: unknown } | undefined)?.message;
   return typeof message === 'string' ? message : undefined;
};

export const isBadRequestWithTextMessage = (error: unknown): boolean =>
   getHttpStatus(error) === 400 && getApiErrorMessage(error) !== undefined;

export const getApiErrorCode = (error: unknown): ApiErrorCode | undefined =>
   isAxiosError<ErrorResponseDto | null>(error)
      ? (error.response?.data?.code ?? undefined)
      : undefined;

export const getHttpErrorMessageKey = (error: unknown): string | undefined => {
   const status = getHttpStatus(error);
   if (status === undefined) return undefined;
   if (status === 403 && getApiErrorMessage(error) === PUBLISHED_CONTENT_FORBIDDEN_MESSAGE) {
      return 'common.httpError.publishedContentLocked';
   }
   return getHttpStatusMessageKey(status);
};

export const isVersionConflict = (error: unknown): boolean =>
   getHttpStatus(error) === 409 && getApiErrorCode(error) === apiErrorCodeEnum.VERSION_CONFLICT;
