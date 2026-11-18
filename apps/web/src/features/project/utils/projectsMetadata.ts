import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { pageRangeHref } from '@/utils/pagination';
import { buildPageMetadata } from '@/utils/seo';

export async function buildProjectsMetadata(
   locale: Locale,
   page: number,
   locales?: readonly string[],
   lastPage = page,
): Promise<Metadata> {
   const t = await getTranslations({ locale, namespace: 'Projects' });

   const isRange = lastPage > page;

   const metadata = buildPageMetadata({
      locale,
      path: pageRangeHref('/projects', page, lastPage),
      title:
         page === 1 && !isRange
            ? t('title')
            : `${t('title')} (${isRange ? `${page}-${lastPage}` : page})`,
      description: t('description'),
      locales,
   });

   return isRange
      ? {
           ...metadata,
           alternates: { canonical: metadata.alternates?.canonical },
           robots: { index: false, follow: true },
        }
      : metadata;
}
