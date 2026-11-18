import { unstable_cache } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';

import { contactPublicControllerFind } from '@/api/generated/clients/contactPublicControllerFind';
import type { PublicContactEntity } from '@/api/generated/models/PublicContactEntity';
import { buildId, cacheOptions } from '@/utils/cacheConfig';

export async function fetchContact(): Promise<PublicContactEntity | null> {
   const { data } = await contactPublicControllerFind();
   return data?.id ? data : null;
}

export const getContact = cache(async (): Promise<PublicContactEntity | null> => {
   const locale = await getLocale();

   return unstable_cache(fetchContact, ['contact', locale, buildId], cacheOptions('contact'))();
});
