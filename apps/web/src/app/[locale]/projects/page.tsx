import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { getPageLocalesSafe } from '@/features/locale-content/api/getLocaleContent';
import { ProjectsPageContent } from '@/features/project/components/ProjectsPageContent';
import { buildProjectsMetadata } from '@/features/project/utils/projectsMetadata';

type ProjectsPageProps = {
   params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: ProjectsPageProps): Promise<Metadata> {
   const { locale } = await params;
   return buildProjectsMetadata(locale, 1, await getPageLocalesSafe('projects'));
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
   const { locale } = await params;
   setRequestLocale(locale);

   return <ProjectsPageContent locale={locale} page={1} />;
}
