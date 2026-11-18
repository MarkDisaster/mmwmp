import { describe, expect, it } from 'vitest';

import { PROJECTS_PAGE_LIMIT } from '@/features/project/constants';
import type { ProjectCardData } from '@/features/project/utils/projectCard';

import {
   appendProjectsPage,
   hasNextPage,
   initialLoadMoreState,
   loadMoreTotalPages,
} from '../utils/loadMore';

const card = (id: number): ProjectCardData => ({
   id,
   slug: `p-${id}`,
   title: `Project ${id}`,
   thumbnail: null,
   years: null,
   tags: [],
});

describe('loadMoreTotalPages', () => {
   it('rounds the count up to whole pages', () => {
      const state = initialLoadMoreState([], 1, PROJECTS_PAGE_LIMIT * 2 + 1);
      expect(loadMoreTotalPages(state)).toBe(3);
   });

   it('is at least one page for an empty list', () => {
      expect(loadMoreTotalPages(initialLoadMoreState([], 1, 0))).toBe(1);
   });

   it('ends at the last page shown once exhausted', () => {
      const state = { ...initialLoadMoreState([card(1)], 2, 100), exhausted: true };
      expect(loadMoreTotalPages(state)).toBe(2);
   });
});

describe('hasNextPage', () => {
   it('offers another page while the count is not shown', () => {
      expect(hasNextPage(initialLoadMoreState([card(1)], 1, PROJECTS_PAGE_LIMIT + 1))).toBe(true);
   });

   it('offers nothing after the last page', () => {
      expect(hasNextPage(initialLoadMoreState([card(1)], 1, PROJECTS_PAGE_LIMIT))).toBe(false);
   });
});

describe('appendProjectsPage', () => {
   const state = initialLoadMoreState([card(1), card(2)], 1, 10);

   it('appends the cards and moves to the page', () => {
      const next = appendProjectsPage(state, 2, { projects: [card(3)], totalCount: 10 });
      expect(next.projects.map((p) => p.id)).toEqual([1, 2, 3]);
      expect(next.lastPage).toBe(2);
      expect(next.exhausted).toBe(false);
   });

   it('does not show a project twice when the list shifted', () => {
      const next = appendProjectsPage(state, 2, { projects: [card(2), card(3)], totalCount: 10 });
      expect(next.projects.map((p) => p.id)).toEqual([1, 2, 3]);
   });

   it('takes the new total count from the response', () => {
      expect(appendProjectsPage(state, 2, { projects: [card(3)], totalCount: 7 }).totalCount).toBe(
         7,
      );
   });

   it('marks the list exhausted by an empty page, keeping the page and cards', () => {
      const next = appendProjectsPage(state, 2, { projects: [], totalCount: 10 });
      expect(next).toMatchObject({ lastPage: 1, exhausted: true });
      expect(next.projects).toBe(state.projects);
      expect(hasNextPage(next)).toBe(false);
   });
});
