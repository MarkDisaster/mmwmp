import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { getSaveFailure } from '../saveFailure';

const httpError = (status: number, data: unknown = null) =>
   new AxiosError('failed', undefined, undefined, undefined, {
      status,
      statusText: '',
      data,
      headers: {},
      config: { headers: new AxiosHeaders() },
   });

describe('getSaveFailure', () => {
   it('should map the statuses of the save to what failed', () => {
      expect(getSaveFailure(httpError(400))).toBe('invalid');
      expect(getSaveFailure(httpError(403))).toBe('forbidden');
      expect(getSaveFailure(httpError(404))).toBe('missing');
   });

   it('should report a 409 as a taken slug only with the SLUG_TAKEN code', () => {
      expect(getSaveFailure(httpError(409, { message: 'taken', code: 'SLUG_TAKEN' }))).toBe(
         'slugTaken',
      );
   });

   it('should report any other 409 as a conflict to retry, not as a taken slug', () => {
      expect(getSaveFailure(httpError(409, { message: 'busy', code: 'BUSY' }))).toBe('conflict');
      expect(
         getSaveFailure(httpError(409, { message: 'changed', code: 'CONCURRENT_CHANGE' })),
      ).toBe('conflict');
      expect(
         getSaveFailure(httpError(409, { message: 'Project with this slug already exists' })),
      ).toBe('conflict');
      expect(getSaveFailure(httpError(409))).toBe('conflict');
   });

   it('should report a 409 with the VERSION_CONFLICT code as a stale version', () => {
      expect(
         getSaveFailure(
            httpError(409, { message: 'changed', code: 'VERSION_CONFLICT', currentVersion: 3 }),
         ),
      ).toBe('versionConflict');
   });

   it('should report any other failure as a failed save', () => {
      expect(getSaveFailure(httpError(500))).toBe('failed');
      expect(getSaveFailure(new AxiosError('Network Error'))).toBe('failed');
      expect(getSaveFailure(new Error('boom'))).toBe('failed');
   });
});
