import { beforeEach, describe, expect, it, vi } from 'vitest';

import { projectPublicControllerFindAllPublished } from '@/api/generated/clients/projectPublicControllerFindAllPublished';
import { PROJECTS_MAX_LIMIT, PROJECTS_PAGE_LIMIT } from '@/features/project/constants';

import { getHomepageProjects, getProjects } from '../api/getProjects';

vi.mock('@/env', () => ({ env: {} }));

vi.mock('next/cache', () => ({
   unstable_cache: (fn: () => unknown) => fn,
}));

vi.mock('@/api/generated/clients/projectPublicControllerFindAllPublished', () => ({
   projectPublicControllerFindAllPublished: vi.fn(),
}));

const findAll = vi.mocked(projectPublicControllerFindAllPublished);

const project = {
   id: 7,
   slug: 'shop',
   translations: [{ language: 'en', title: 'Shop' }],
   tags: [],
   thumbnail: null,
};

describe('getProjects', () => {
   beforeEach(() => {
      findAll.mockReset();
      findAll.mockResolvedValue({ data: { data: [project], totalCount: 12 } } as never);
   });

   it('asks the API for the page in the locale it was given', async () => {
      await getProjects('en', 3);

      expect(findAll).toHaveBeenCalledWith(
         { page: 2, limit: PROJECTS_PAGE_LIMIT },
         { 'Accept-Language': 'en' },
      );
   });

   it('returns cards and the total count', async () => {
      expect(await getProjects('en', 1)).toEqual({
         projects: [{ id: 7, slug: 'shop', title: 'Shop', thumbnail: null, years: null, tags: [] }],
         totalCount: 12,
      });
   });

   it('returns an empty page when the API sends no data', async () => {
      findAll.mockResolvedValueOnce({ data: {} } as never);

      expect(await getProjects('cs', 1)).toEqual({ projects: [], totalCount: 0 });
   });
});

describe('getHomepageProjects', () => {
   beforeEach(() => {
      findAll.mockReset();
      findAll.mockResolvedValue({ data: { data: [project], totalCount: 1 } } as never);
   });

   it('asks for the homepage projects in the locale it was given', async () => {
      const cards = await getHomepageProjects('en');

      expect(findAll).toHaveBeenCalledWith(
         { page: 0, limit: PROJECTS_MAX_LIMIT, homepageOnly: true },
         { 'Accept-Language': 'en' },
      );
      expect(cards.map(({ id }) => id)).toEqual([7]);
   });
});
