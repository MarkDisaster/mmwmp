import { unstable_cache } from 'next/cache';

import { projectPublicControllerFindRedirect } from '@/api/generated/clients/projectPublicControllerFindRedirect';
import { buildId, cacheOptions } from '@/utils/cacheConfig';
import { nullOnNotFound } from '@/utils/http';

const findRedirectSlug = (slug: string) =>
   unstable_cache(
      async () => (await nullOnNotFound(projectPublicControllerFindRedirect(slug)))?.slug ?? null,
      ['project-redirect', slug, buildId],
      cacheOptions('projects'),
   )();

export const getProjectRedirect = (slug: string): Promise<string | null> => findRedirectSlug(slug);
