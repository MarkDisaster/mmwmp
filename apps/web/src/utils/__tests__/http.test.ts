import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { nullOnNotFound } from '../http';

const httpError = (status: number) => {
   const error = new AxiosError('failed');
   error.response = { status } as never;
   return error;
};

describe('nullOnNotFound', () => {
   it('returns the data of the response', async () => {
      expect(await nullOnNotFound(Promise.resolve({ data: { slug: 'shop' } }))).toEqual({
         slug: 'shop',
      });
   });

   it('returns null when the API answers 404', async () => {
      expect(await nullOnNotFound(Promise.reject(httpError(404)))).toBeNull();
   });

   it.each([429, 500, 503])('lets a %i propagate, so it is not cached', async (status) => {
      await expect(nullOnNotFound(Promise.reject(httpError(status)))).rejects.toThrow('failed');
   });

   it('lets an error without a response propagate', async () => {
      await expect(nullOnNotFound(Promise.reject(new TypeError('offline')))).rejects.toThrow(
         'offline',
      );
   });
});
