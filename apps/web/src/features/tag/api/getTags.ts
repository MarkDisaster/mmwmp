import { unstable_cache } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';

import { tagPublicControllerFindAll } from '@/api/generated/clients/tagPublicControllerFindAll';
import { buildId, cacheOptions } from '@/utils/cacheConfig';

export const getTags = cache(async () => {
   const locale = await getLocale();

   return unstable_cache(
      async () => (await tagPublicControllerFindAll({ limit: 100 })).data,
      ['tags', locale, buildId],
      cacheOptions('tags'),
   )();
});
