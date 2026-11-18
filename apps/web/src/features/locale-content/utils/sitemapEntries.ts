import type { MetadataRoute } from 'next';

import { env } from '@/env';
import {
   getPageLocales,
   getPageUpdatedAt,
   type LocaleContent,
   type LocalePage,
   PAGE_PATHS,
} from '@/features/locale-content/utils/localeContent';
import { buildLanguageAlternates } from '@/utils/seo';

const PAGES = Object.keys(PAGE_PATHS) as LocalePage[];

const localizedEntries = (
   path: string,
   locales: readonly string[],
   fields: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
): MetadataRoute.Sitemap => {
   const languages = buildLanguageAlternates(path, locales);

   return locales.map((locale) => ({
      url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}${path}`,
      alternates: { languages },
      ...fields,
   }));
};

export const buildSitemapEntries = (content: LocaleContent): MetadataRoute.Sitemap => {
   const pages = PAGES.flatMap((page) => {
      const updatedAt = getPageUpdatedAt(content, page);

      return localizedEntries(PAGE_PATHS[page], getPageLocales(content, page), {
         ...(updatedAt ? { lastModified: new Date(updatedAt) } : {}),
         changeFrequency: 'weekly',
         priority: page === 'home' ? 1 : 0.8,
      });
   });

   const projects = content.projects.flatMap((project) =>
      localizedEntries(`${PAGE_PATHS.projects}/${project.slug}`, project.locales, {
         lastModified: new Date(project.updatedAt),
         changeFrequency: 'monthly',
         priority: 0.7,
      }),
   );

   return [...pages, ...projects];
};
