import type { MetadataRoute } from 'next';

import { getLocaleContentSafe } from '@/features/locale-content/api/getLocaleContent';
import { buildSitemapEntries } from '@/features/locale-content/utils/sitemapEntries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
   return buildSitemapEntries(await getLocaleContentSafe());
}
