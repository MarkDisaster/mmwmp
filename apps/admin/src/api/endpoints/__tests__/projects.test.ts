import { MutationObserver, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { projects, queryKeys } from '@/api/endpoints/projects';
import type { ProjectEntity } from '@/api/generated';
import {
   projectControllerFindAll,
   projectControllerFindOne,
   projectControllerMove,
   projectControllerRemove,
   projectControllerSaveExisting,
} from '@/api/generated';
import { queryClient } from '@/utils/query-client';

vi.mock('@/api/generated', async (importOriginal) => ({
   ...(await importOriginal<typeof import('@/api/generated')>()),
   projectControllerFindAll: vi.fn(),
   projectControllerFindOne: vi.fn(),
   projectControllerMove: vi.fn(),
   projectControllerRemove: vi.fn(),
   projectControllerSaveExisting: vi.fn(),
}));

const project = (id: number) => ({ id, slug: `project-${id}` }) as ProjectEntity;
const answer = <T>(data: T) => Promise.resolve({ data }) as never;

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

let unsubscribers: (() => void)[] = [];

beforeEach(async () => {
   vi.mocked(projectControllerFindAll).mockImplementation(() =>
      answer({ data: [project(5), project(6)], totalCount: 2 }),
   );
   vi.mocked(projectControllerFindOne).mockImplementation((id) => answer(project(Number(id))));
   unsubscribers = [
      new QueryObserver(queryClient, projects.queries.all()).subscribe(() => {}),
      new QueryObserver(queryClient, projects.queries.detail(5)).subscribe(() => {}),
      new QueryObserver(queryClient, projects.queries.detail(6)).subscribe(() => {}),
   ];
   await settle();
   vi.mocked(projectControllerFindAll).mockClear();
   vi.mocked(projectControllerFindOne).mockClear();
});

afterEach(() => {
   unsubscribers.forEach((unsubscribe) => unsubscribe());
   queryClient.clear();
});

describe('projects query keys', () => {
   it('should keep the lists and the details apart under the resource', () => {
      expect(queryKeys.list({ page: 1 })).toEqual(['projects', 'list', { page: 1 }]);
      expect(queryKeys.detail(5)).toEqual(['projects', 'detail', 5]);
      expect(queryKeys.list().slice(0, 2)).toEqual(queryKeys.lists());
      expect(queryKeys.detail(5).slice(0, 2)).toEqual(queryKeys.details());
   });
});

describe('projects mutations', () => {
   it('should not ask again for the detail of a deleted project, only for the lists', async () => {
      vi.mocked(projectControllerRemove).mockImplementation(() => answer(project(5)));

      await new MutationObserver(queryClient, projects.mutations.remove).mutate({ id: 5 });
      await settle();

      expect(projectControllerFindAll).toHaveBeenCalledTimes(1);
      expect(projectControllerFindOne).not.toHaveBeenCalled();
      expect(queryClient.getQueryState(queryKeys.detail(5))?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(queryKeys.detail(6))?.isInvalidated).toBe(false);
   });

   it('should refetch the open detail of a moved project and only mark an unopened one stale', async () => {
      vi.mocked(projectControllerMove).mockImplementation(() => answer(project(5)));
      queryClient.setQueryData(queryKeys.detail(7), project(7));

      await new MutationObserver(queryClient, projects.mutations.move).mutate({
         id: 5,
         data: { targetId: 6, position: 'after' },
      });
      await settle();
      await new MutationObserver(queryClient, projects.mutations.move).mutate({
         id: 7,
         data: { targetId: 6, position: 'after' },
      });
      await settle();

      expect(projectControllerFindOne).toHaveBeenCalledTimes(1);
      expect(projectControllerFindOne).toHaveBeenCalledWith(5);
      expect(queryClient.getQueryState(queryKeys.detail(7))?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(queryKeys.detail(6))?.isInvalidated).toBe(false);
   });

   it('should remove the detail of a project deleted from the list, where nothing observes it', async () => {
      vi.mocked(projectControllerRemove).mockImplementation(() => answer(project(7)));
      queryClient.setQueryData(queryKeys.detail(7), project(7));

      await new MutationObserver(queryClient, projects.mutations.remove).mutate({ id: 7 });
      await settle();

      expect(queryClient.getQueryState(queryKeys.detail(7))).toBeUndefined();
      expect(queryClient.getQueryState(queryKeys.detail(6))).toBeDefined();
   });

   it('should keep the failed delete from touching the cached detail', async () => {
      vi.mocked(projectControllerRemove).mockImplementation(() => Promise.reject(new Error('x')));
      queryClient.setQueryData(queryKeys.detail(7), project(7));

      await new MutationObserver(queryClient, projects.mutations.remove)
         .mutate({ id: 7 })
         .catch(() => {});
      await settle();

      expect(queryClient.getQueryData(queryKeys.detail(7))).toEqual(project(7));
   });

   it('should keep the saved project from the answer and refetch only the lists', async () => {
      const saved = { ...project(5), slug: 'renamed' };
      vi.mocked(projectControllerSaveExisting).mockImplementation(() => answer(saved));

      await new MutationObserver(queryClient, projects.mutations.saveExisting).mutate({
         id: 5,
         data: {} as never,
      });
      await settle();

      expect(queryClient.getQueryData(queryKeys.detail(5))).toEqual(saved);
      expect(projectControllerFindAll).toHaveBeenCalledTimes(1);
      expect(projectControllerFindOne).not.toHaveBeenCalled();
   });
});
