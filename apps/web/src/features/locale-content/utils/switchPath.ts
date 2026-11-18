import type { LocaleContent } from '@/features/locale-content/utils/localeContent';
import { PAGE_PATHS } from '@/features/locale-content/utils/localeContent';

export type ProjectLocalesBySlug = Record<string, readonly string[]>;

export const toProjectLocalesBySlug = (projects: LocaleContent['projects']): ProjectLocalesBySlug =>
   Object.fromEntries(projects.map(({ slug, locales }) => [slug, locales]));

const PROJECTS_PREFIX = `${PAGE_PATHS.projects}/`;
const PROJECTS_PAGE_PREFIX = `${PROJECTS_PREFIX}page/`;

export const resolveSwitchPathname = (
   pathname: string,
   target: string,
   projectLocales: ProjectLocalesBySlug,
): string => {
   if (pathname.startsWith(PROJECTS_PAGE_PREFIX)) return PAGE_PATHS.projects;

   if (pathname.startsWith(PROJECTS_PREFIX)) {
      const slug = pathname.slice(PROJECTS_PREFIX.length);
      return projectLocales[slug]?.includes(target) ? pathname : PAGE_PATHS.projects;
   }

   return pathname;
};
