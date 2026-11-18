import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProjects } from '@/features/project/api/getProjects';

import { GET } from '../route';

vi.mock('@/features/project/api/getProjects', () => ({ getProjects: vi.fn() }));

const get = vi.mocked(getProjects);

const request = (query: string) => new NextRequest(`https://marek.media/api/projects?${query}`);

describe('GET /api/projects', () => {
   beforeEach(() => {
      get.mockReset();
      get.mockResolvedValue({ projects: [], totalCount: 0 });
   });

   it('answers the requested page in the requested locale', async () => {
      const response = await GET(request('locale=en&page=2'));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ projects: [], totalCount: 0 });
      expect(get).toHaveBeenCalledWith('en', 2);
   });

   it('refuses an invalid query without reaching the API', async () => {
      for (const query of ['locale=en', 'locale=de&page=2', 'locale=cs&page=02', 'page=2']) {
         expect((await GET(request(query))).status).toBe(400);
      }
      expect(get).not.toHaveBeenCalled();
   });
});
