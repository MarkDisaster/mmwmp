import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Locale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { getPageLocalesSafe } from '@/features/locale-content/api/getLocaleContent';
import { getProjects } from '@/features/project/api/getProjects';
import { ProjectsPageContent } from '@/features/project/components/ProjectsPageContent';
import { PROJECTS_MAX_PAGE, PROJECTS_PAGE_LIMIT } from '@/features/project/constants';
import { buildProjectsMetadata } from '@/features/project/utils/projectsMetadata';
import { parseProjectsPageRange } from '@/features/project/utils/projectsPage';
import { routing } from '@/i18n/routing';

const pageCount = (totalCount: number) =>
   Math.min(Math.ceil(totalCount / PROJECTS_PAGE_LIMIT), PROJECTS_MAX_PAGE);

type ProjectsPagedPageProps = {
   params: Promise<{ locale: Locale; page: string }>;
};

export async function generateStaticParams() {
   try {
      const counts = await Promise.all(
         routing.locales.map(async (locale) => ({
            locale,
            totalCount: (await getProjects(locale, 1)).totalCount,
         })),
      );

      return counts.flatMap(({ locale, totalCount }) =>
         Array.from({ length: Math.max(0, pageCount(totalCount) - 1) }, (_, i) => ({
            locale,
            page: String(i + 2),
         })),
      );
   } catch (error) {
      console.error('generateStaticParams(projects/page/[page]) failed:', error);
      return [];
   }
}

export async function generateMetadata({ params }: ProjectsPagedPageProps): Promise<Metadata> {
   const { locale, page } = await params;
   const range = parseProjectsPageRange(page);
   if (!range) return {};
   return buildProjectsMetadata(
      locale,
      range.first,
      await getPageLocalesSafe('projects'),
      range.last,
   );
}

export default async function ProjectsPagedPage({ params }: ProjectsPagedPageProps) {
   const { locale, page } = await params;
   setRequestLocale(locale);

   if (page === '1') permanentRedirect(`/${locale}/projects`);

   const range = parseProjectsPageRange(page);
   if (!range) notFound();

   return <ProjectsPageContent locale={locale} page={range.first} lastPage={range.last} />;
}
