import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { servicePublicControllerFindAllPublished } from '@/api/generated/clients/servicePublicControllerFindAllPublished';
import { buildId, cacheOptions } from '@/utils/cacheConfig';

export const getServices = cache(async (locale: string, homepageOnly = false) =>
   unstable_cache(
      async () =>
         (
            await servicePublicControllerFindAllPublished(
               homepageOnly ? { homepageOnly: true } : undefined,
               { 'Accept-Language': locale },
            )
         ).data,
      ['services', locale, homepageOnly ? 'homepage' : 'all', buildId],
      cacheOptions('services'),
   )(),
);
