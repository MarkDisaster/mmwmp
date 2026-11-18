import { unstable_cache } from 'next/cache';

import { getAllPublishedProjects } from '@/features/project/api/getAllPublishedProjects';
import { toProjectLocales } from '@/features/project/utils/projectLocales';
import { buildId, cacheOptions } from '@/utils/cacheConfig';

export const getProjectLocales = unstable_cache(
   async () => toProjectLocales(await getAllPublishedProjects()),
   ['project-locales', buildId],
   cacheOptions('projects'),
);
