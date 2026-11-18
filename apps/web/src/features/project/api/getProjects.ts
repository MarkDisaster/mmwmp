import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { projectPublicControllerFindAllPublished } from '@/api/generated/clients/projectPublicControllerFindAllPublished';
import type { ProjectPublicControllerFindAllPublishedQueryParams } from '@/api/generated/models/ProjectPublicControllerFindAllPublished';
import { PROJECTS_MAX_LIMIT, PROJECTS_PAGE_LIMIT } from '@/features/project/constants';
import {
   type ProjectCardData,
   type ProjectCardsPage,
   toProjectCards,
} from '@/features/project/utils/projectCard';
import { buildId, cacheOptions } from '@/utils/cacheConfig';

const fetchProjectCards = async (
   locale: string,
   params: ProjectPublicControllerFindAllPublishedQueryParams,
): Promise<ProjectCardsPage> => {
   const { data } = await projectPublicControllerFindAllPublished(params, {
      'Accept-Language': locale,
   });
   return { projects: toProjectCards(data?.data ?? [], locale), totalCount: data?.totalCount ?? 0 };
};

export const getProjects = cache(
   async (locale: string, page: number): Promise<ProjectCardsPage> =>
      unstable_cache(
         () => fetchProjectCards(locale, { page: page - 1, limit: PROJECTS_PAGE_LIMIT }),
         ['projects', locale, String(page), buildId],
         cacheOptions('projects'),
      )(),
);

export const getHomepageProjects = cache(
   async (locale: string): Promise<ProjectCardData[]> =>
      unstable_cache(
         async () =>
            (
               await fetchProjectCards(locale, {
                  page: 0,
                  limit: PROJECTS_MAX_LIMIT,
                  homepageOnly: true,
               })
            ).projects,
         ['projects', locale, 'homepage', buildId],
         cacheOptions('projects'),
      )(),
);
