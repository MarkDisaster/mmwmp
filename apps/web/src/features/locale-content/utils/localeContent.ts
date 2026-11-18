import type { ProjectLocales } from '@/features/project/utils/projectLocales';
import { routing } from '@/i18n/routing';

export type LocalePage = 'home' | 'about' | 'projects' | 'contact';

export const PAGE_PATHS = {
   home: '',
   projects: '/projects',
   about: '/about',
   contact: '/contact',
} as const satisfies Record<LocalePage, string>;

type ContentSource = 'contact' | 'services' | 'projects';

const PAGE_SOURCES = {
   home: ['contact', 'services', 'projects'],
   about: ['contact', 'services'],
   projects: ['projects'],
   contact: ['contact'],
} as const satisfies Record<LocalePage, readonly ContentSource[]>;

export type LocaleContentSources = {
   projects: ProjectLocales[];
   services: { updatedAt: string; locales: readonly string[] }[];
   contact: {
      updatedAt: string;
      translations: { language: string; description?: string | null }[];
   } | null;
};

export type LocaleContent = {
   locales: string[];
   hasContact: boolean;
   projects: ProjectLocales[];
   updatedAt: Record<ContentSource, string | null>;
};

export const hasLocaleContent = (
   locale: string,
   { projects, services, contact }: LocaleContentSources,
): boolean =>
   projects.some((project) => project.locales.includes(locale)) ||
   services.some((service) => service.locales.includes(locale)) ||
   (contact?.translations.some(
      (translation) => translation.language === locale && !!translation.description?.trim(),
   ) ??
      false);

const newest = (dates: readonly string[]): string | null =>
   dates.length === 0 ? null : new Date(Math.max(...dates.map((d) => Date.parse(d)))).toISOString();

export const resolveLocaleContent = (sources: LocaleContentSources): LocaleContent => ({
   locales: routing.locales.filter((locale) => hasLocaleContent(locale, sources)),
   hasContact: sources.contact !== null,
   projects: sources.projects,
   updatedAt: {
      contact: sources.contact ? newest([sources.contact.updatedAt]) : null,
      services: newest(sources.services.map((service) => service.updatedAt)),
      projects: newest(sources.projects.map((project) => project.updatedAt)),
   },
});

export const getPageLocales = (content: LocaleContent, page: LocalePage): string[] =>
   page === 'contact' && !content.hasContact ? [] : content.locales;

export const getPageUpdatedAt = (content: LocaleContent, page: LocalePage): string | null =>
   newest(
      PAGE_SOURCES[page].flatMap((source) => {
         const date = content.updatedAt[source];
         return date ? [date] : [];
      }),
   );
