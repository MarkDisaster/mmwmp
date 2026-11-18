import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { projectPublicControllerFindBySlug } from '@/api/generated/clients/projectPublicControllerFindBySlug';
import { buildId, cacheOptions } from '@/utils/cacheConfig';
import { nullOnNotFound } from '@/utils/http';

export const getProject = cache(async (slug: string, locale: string) =>
   unstable_cache(
      () => nullOnNotFound(projectPublicControllerFindBySlug(slug, { 'Accept-Language': locale })),
      ['project', slug, locale, buildId],
      cacheOptions('projects'),
   )(),
);
