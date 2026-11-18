import { unstable_cache } from 'next/cache';

import { servicePublicControllerFindAllPublished } from '@/api/generated/clients/servicePublicControllerFindAllPublished';
import { fetchContact } from '@/features/contact/api/getContact';
import {
   getPageLocales,
   type LocaleContent,
   type LocaleContentSources,
   type LocalePage,
   resolveLocaleContent,
} from '@/features/locale-content/utils/localeContent';
import { getProjectLocales } from '@/features/project/api/getProjectLocales';
import { routing } from '@/i18n/routing';
import { buildId, cacheOptions } from '@/utils/cacheConfig';

const fetchServices = async (): Promise<LocaleContentSources['services']> => {
   const perLocale = await Promise.all(
      routing.locales.map(async (locale) => {
         const { data } = await servicePublicControllerFindAllPublished(undefined, {
            'Accept-Language': locale,
         });
         return (data?.data ?? []).map((service) => ({
            id: service.id,
            updatedAt: new Date(service.updatedAt).toISOString(),
            locale: service.translations.length > 0 ? locale : null,
         }));
      }),
   );

   const services = new Map<number, { updatedAt: string; locales: string[] }>();
   for (const { id, updatedAt, locale } of perLocale.flat()) {
      const entry = services.get(id) ?? { updatedAt, locales: [] };
      if (locale) entry.locales.push(locale);
      services.set(id, entry);
   }
   return [...services.values()];
};

const getLocaleContent = unstable_cache(
   async (): Promise<LocaleContent> => {
      const [projects, services, contact] = await Promise.all([
         getProjectLocales(),
         fetchServices(),
         fetchContact(),
      ]);
      return resolveLocaleContent({ projects, services, contact });
   },
   ['locale-content', buildId],
   cacheOptions('projects', 'services', 'contact'),
);

const UNKNOWN_CONTENT: LocaleContent = {
   locales: [...routing.locales],
   hasContact: true,
   projects: [],
   updatedAt: { contact: null, services: null, projects: null },
};

export const getLocaleContentSafe = async (): Promise<LocaleContent> => {
   try {
      return await getLocaleContent();
   } catch (error) {
      console.error('[locale-content] Failed to load, assuming every locale has content:', error);
      return UNKNOWN_CONTENT;
   }
};

export const getPageLocalesSafe = async (page: LocalePage): Promise<string[]> =>
   getPageLocales(await getLocaleContentSafe(), page);
