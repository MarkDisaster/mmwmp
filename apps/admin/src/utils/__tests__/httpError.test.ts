import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import {
   getHttpErrorMessageKey,
   getHttpStatus,
   getHttpStatusMessageKey,
   isClientError,
   isVersionConflict,
   PUBLISHED_CONTENT_FORBIDDEN_MESSAGE,
} from '../httpError';

const NETWORK_ERROR = 'Network Error';

const responseError = (status: number, data: unknown = null) =>
   new AxiosError('failed', undefined, undefined, undefined, {
      status,
      statusText: '',
      data,
      headers: {},
      config: { headers: new AxiosHeaders() },
   });

describe('getHttpStatus', () => {
   it('should read the status of an API response', () => {
      expect(getHttpStatus(responseError(401))).toBe(401);
   });

   it('should be undefined when no response came or the error is not from axios', () => {
      expect(getHttpStatus(new AxiosError(NETWORK_ERROR, 'ERR_NETWORK'))).toBeUndefined();
      expect(getHttpStatus(new Error('boom'))).toBeUndefined();
   });
});

describe('isClientError', () => {
   it('should hold for 4xx answers only', () => {
      expect(isClientError(responseError(400))).toBe(true);
      expect(isClientError(responseError(404))).toBe(true);
      expect(isClientError(responseError(499))).toBe(true);
      expect(isClientError(responseError(500))).toBe(false);
      expect(isClientError(responseError(399))).toBe(false);
   });

   it('should not hold for network failures', () => {
      expect(isClientError(new AxiosError(NETWORK_ERROR, 'ERR_NETWORK'))).toBe(false);
   });
});

describe('getHttpErrorMessageKey', () => {
   it('should explain a change of published content without the publish permission', () => {
      const error = responseError(403, {
         statusCode: 403,
         message: PUBLISHED_CONTENT_FORBIDDEN_MESSAGE,
      });

      expect(getHttpErrorMessageKey(error)).toBe('common.httpError.publishedContentLocked');
   });

   it('should leave another 403 to the caller', () => {
      expect(getHttpErrorMessageKey(responseError(403, { message: 'Forbidden resource' }))).toBe(
         undefined,
      );
      expect(getHttpErrorMessageKey(responseError(403))).toBeUndefined();
   });

   it('should explain too many requests and a file too large', () => {
      expect(getHttpErrorMessageKey(responseError(429))).toBe('common.httpError.tooManyRequests');
      expect(getHttpErrorMessageKey(responseError(413))).toBe('common.httpError.payloadTooLarge');
      expect(getHttpStatusMessageKey(429)).toBe('common.httpError.tooManyRequests');
   });

   it('should leave other failures to the caller', () => {
      expect(getHttpErrorMessageKey(responseError(500))).toBeUndefined();
      expect(getHttpErrorMessageKey(new AxiosError(NETWORK_ERROR, 'ERR_NETWORK'))).toBeUndefined();
      expect(getHttpErrorMessageKey(new Error('boom'))).toBeUndefined();
   });
});

describe('isVersionConflict', () => {
   it('should be true only for a 409 with the VERSION_CONFLICT code', () => {
      expect(isVersionConflict(responseError(409, { code: 'VERSION_CONFLICT' }))).toBe(true);
      expect(isVersionConflict(responseError(409, { code: 'BUSY' }))).toBe(false);
      expect(isVersionConflict(responseError(409))).toBe(false);
      expect(isVersionConflict(responseError(400, { code: 'VERSION_CONFLICT' }))).toBe(false);
      expect(isVersionConflict(new Error('boom'))).toBe(false);
   });
});
