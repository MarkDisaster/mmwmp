import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { servicePublicControllerFindAllPublished } from '@/api/generated/clients/servicePublicControllerFindAllPublished';

import { getPreviewServices } from '../api/getPreviewServices';

vi.mock('@/env', () => ({ env: { PREVIEW_API_TOKEN: 'api-token', PREVIEW_SECRET: 'legacy' } }));

vi.mock('@/api/generated/clients/servicePublicControllerFindAllPublished', () => ({
   servicePublicControllerFindAllPublished: vi.fn(),
}));

const findAll = vi.mocked(servicePublicControllerFindAllPublished);

describe('getPreviewServices', () => {
   beforeEach(() => {
      findAll.mockResolvedValue({ data: { data: [], totalCount: 0 } } as never);
   });
   afterEach(() => vi.resetAllMocks());

   it('asks the API for the drafts in the locale with the preview API token', async () => {
      await getPreviewServices('en');

      expect(findAll).toHaveBeenCalledWith(undefined, {
         'Accept-Language': 'en',
         Authorization: 'Bearer api-token',
      });
   });

   it('returns the body of the response', async () => {
      expect(await getPreviewServices('cs')).toEqual({ data: [], totalCount: 0 });
   });
});
