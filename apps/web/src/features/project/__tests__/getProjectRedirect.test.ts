import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { projectPublicControllerFindRedirect } from '@/api/generated/clients/projectPublicControllerFindRedirect';

import { getProjectRedirect } from '../api/getProjectRedirect';

vi.mock('@/env', () => ({ env: {} }));

vi.mock('next/cache', () => ({
   unstable_cache: (fn: () => unknown) => fn,
}));

vi.mock('@/api/generated/clients/projectPublicControllerFindRedirect', () => ({
   projectPublicControllerFindRedirect: vi.fn(),
}));

const findRedirect = vi.mocked(projectPublicControllerFindRedirect);

const httpError = (status: number) => {
   const error = new AxiosError('failed');
   error.response = { status } as never;
   return error;
};

describe('getProjectRedirect', () => {
   beforeEach(() => {
      findRedirect.mockReset();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
   });

   it('returns the current slug', async () => {
      findRedirect.mockResolvedValue({ data: { slug: 'new-slug' } } as never);

      expect(await getProjectRedirect('old-slug')).toBe('new-slug');
      expect(findRedirect).toHaveBeenCalledWith('old-slug');
   });

   it('returns null on 404', async () => {
      findRedirect.mockRejectedValue(httpError(404));

      expect(await getProjectRedirect('nope')).toBeNull();
   });

   it('lets an API failure propagate, so a failed call is not cached as a 404', async () => {
      findRedirect.mockRejectedValue(httpError(500));

      await expect(getProjectRedirect('old-slug')).rejects.toBeDefined();
   });
});
