import { beforeEach, describe, expect, it, vi } from 'vitest';

import { projectPublicControllerFindAllPublished } from '@/api/generated/clients/projectPublicControllerFindAllPublished';
import { PROJECTS_MAX_LIMIT } from '@/features/project/constants';

import { getAllPublishedProjects } from '../api/getAllPublishedProjects';

vi.mock('@/api/generated/clients/projectPublicControllerFindAllPublished', () => ({
   projectPublicControllerFindAllPublished: vi.fn(),
}));

const findAll = vi.mocked(projectPublicControllerFindAllPublished);

const projects = (from: number, count: number) =>
   Array.from({ length: count }, (_, i) => ({ id: from + i, slug: `p-${from + i}` }));

const answer = (data: unknown[], totalCount: number) =>
   ({ data: { data, totalCount } }) as unknown as Awaited<ReturnType<typeof findAll>>;

describe('getAllPublishedProjects', () => {
   beforeEach(() => findAll.mockReset());

   it('returns everything from a single page without a second request', async () => {
      findAll.mockResolvedValueOnce(answer(projects(1, 3), 3));

      const result = await getAllPublishedProjects();

      expect(result).toHaveLength(3);
      expect(findAll).toHaveBeenCalledTimes(1);
      expect(findAll).toHaveBeenCalledWith({ page: 0, limit: PROJECTS_MAX_LIMIT });
   });

   it('keeps fetching pages until totalCount is reached', async () => {
      const total = PROJECTS_MAX_LIMIT * 2 + 5;
      findAll
         .mockResolvedValueOnce(answer(projects(1, PROJECTS_MAX_LIMIT), total))
         .mockResolvedValueOnce(answer(projects(1001, PROJECTS_MAX_LIMIT), total))
         .mockResolvedValueOnce(answer(projects(2001, 5), total));

      const result = await getAllPublishedProjects();

      expect(result).toEqual([
         ...projects(1, PROJECTS_MAX_LIMIT),
         ...projects(1001, PROJECTS_MAX_LIMIT),
         ...projects(2001, 5),
      ]);
      expect(findAll.mock.calls.map(([query]) => query?.page)).toEqual([0, 1, 2]);
   });

   it('stops on an empty page even when totalCount promises more', async () => {
      findAll
         .mockResolvedValueOnce(answer(projects(1, 2), 50))
         .mockResolvedValueOnce(answer([], 50));

      const result = await getAllPublishedProjects();

      expect(result).toHaveLength(2);
      expect(findAll).toHaveBeenCalledTimes(2);
   });

   it('lists a project once when ties in the BE ordering repeat it on the next page', async () => {
      findAll
         .mockResolvedValueOnce(answer(projects(1, PROJECTS_MAX_LIMIT), PROJECTS_MAX_LIMIT + 3))
         .mockResolvedValueOnce(answer(projects(PROJECTS_MAX_LIMIT, 4), PROJECTS_MAX_LIMIT + 3));

      const result = await getAllPublishedProjects();

      expect(result.map((p) => p.id)).toEqual(
         Array.from({ length: PROJECTS_MAX_LIMIT + 3 }, (_, i) => i + 1),
      );
      expect(findAll).toHaveBeenCalledTimes(2);
   });

   it('returns an empty list when there are no projects', async () => {
      findAll.mockResolvedValueOnce(answer([], 0));

      expect(await getAllPublishedProjects()).toEqual([]);
      expect(findAll).toHaveBeenCalledTimes(1);
   });

   it('lets API errors through so the caller can decide how to degrade', async () => {
      findAll.mockRejectedValueOnce(new Error('api down'));

      await expect(getAllPublishedProjects()).rejects.toThrow('api down');
   });
});
