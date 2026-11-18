import { isNotFound } from '@tanstack/react-router';
import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { notFoundOn404, parseIdParam } from '../detailRoute';

const catchError = (fn: () => unknown) => {
   try {
      fn();
   } catch (error) {
      return error;
   }
   throw new Error('expected the call to throw');
};

const axiosError = (status: number) =>
   new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status,
   } as AxiosResponse);

describe('parseIdParam', () => {
   it('should parse a positive integer id', () => {
      expect(parseIdParam('1')).toBe(1);
      expect(parseIdParam('42')).toBe(42);
   });

   it.each(['', 'abc', '0', '-1', '1.5', '1e3', ' 7', '07', '9007199254740993'])(
      'should throw not-found for %j',
      (value) => {
         expect(isNotFound(catchError(() => parseIdParam(value)))).toBe(true);
      },
   );
});

describe('notFoundOn404', () => {
   it('should resolve with the data of a successful request', async () => {
      await expect(notFoundOn404(Promise.resolve({ id: 1 }))).resolves.toEqual({ id: 1 });
   });

   it('should turn a 404 into not-found', async () => {
      const error = await notFoundOn404(Promise.reject(axiosError(404))).catch((e: unknown) => e);
      expect(isNotFound(error)).toBe(true);
   });

   it('should rethrow any other error unchanged', async () => {
      const serverError = axiosError(500);
      const networkError = new Error('Network Error');

      await expect(notFoundOn404(Promise.reject(serverError))).rejects.toBe(serverError);
      await expect(notFoundOn404(Promise.reject(networkError))).rejects.toBe(networkError);
   });
});
