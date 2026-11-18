import { PROJECTS_PAGE_LIMIT } from '@/features/project/constants';
import type { ProjectCardData, ProjectCardsPage } from '@/features/project/utils/projectCard';

export type LoadMoreState = {
   projects: ProjectCardData[];
   lastPage: number;
   totalCount: number;
   exhausted: boolean;
};

export const initialLoadMoreState = (
   projects: ProjectCardData[],
   page: number,
   totalCount: number,
): LoadMoreState => ({ projects, lastPage: page, totalCount, exhausted: false });

export const loadMoreTotalPages = ({ lastPage, totalCount, exhausted }: LoadMoreState): number =>
   exhausted ? lastPage : Math.max(1, Math.ceil(totalCount / PROJECTS_PAGE_LIMIT));

export const hasNextPage = (state: LoadMoreState): boolean =>
   state.lastPage < loadMoreTotalPages(state);

export const appendProjectsPage = (
   state: LoadMoreState,
   page: number,
   { projects, totalCount }: ProjectCardsPage,
): LoadMoreState => {
   if (projects.length === 0) return { ...state, totalCount, exhausted: true };

   const shown = new Set(state.projects.map((project) => project.id));

   return {
      projects: [...state.projects, ...projects.filter((project) => !shown.has(project.id))],
      lastPage: page,
      totalCount,
      exhausted: false,
   };
};
