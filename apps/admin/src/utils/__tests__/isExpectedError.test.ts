import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { isExpectedError } from '../isExpectedError';

const axiosError = (status?: number) =>
   new AxiosError(
      'failed',
      undefined,
      undefined,
      undefined,
      status === undefined
         ? undefined
         : ({ status, data: {}, headers: {}, statusText: '', config: {} } as never),
   );

describe('isExpectedError', () => {
   it.each([403, 404, 409, 429])('should treat a %s from the API as expected', (status) => {
      expect(isExpectedError(axiosError(status))).toBe(true);
   });

   it('should not treat a 5xx, a network failure or another error as expected', () => {
      expect(isExpectedError(axiosError(500))).toBe(false);
      expect(isExpectedError(axiosError())).toBe(false);
      expect(isExpectedError(new Error('boom'))).toBe(false);
   });
});
