import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';
import { routing } from '@/i18n/routing';

export type ProjectLocales = {
   slug: string;
   updatedAt: string;
   locales: string[];
};

export const toProjectLocales = (
   projects: Pick<PublicProjectEntity, 'slug' | 'updatedAt' | 'translations'>[],
): ProjectLocales[] =>
   projects.map(({ slug, updatedAt, translations }) => ({
      slug,
      updatedAt: new Date(updatedAt).toISOString(),
      locales: routing.locales.filter((locale) =>
         translations.some((translation) => translation.language === locale),
      ),
   }));

export const projectDetailLocales = (
   entries: ProjectLocales[],
   slug: string,
   locale: string,
): string[] => {
   const entry = entries.find((candidate) => candidate.slug === slug);
   return entry?.locales.includes(locale) ? entry.locales : [locale];
};
