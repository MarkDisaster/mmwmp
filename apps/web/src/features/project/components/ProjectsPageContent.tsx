import { notFound } from 'next/navigation';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { JsonLd } from '@/components/common/JsonLd';
import { SectionHeader } from '@/components/common/SectionHeader';
import { getContact } from '@/features/contact/api/getContact';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { getProjects } from '@/features/project/api/getProjects';
import { ProjectsView } from '@/features/project/components/ProjectsView';
import {
   appendProjectsPage,
   initialLoadMoreState,
   type LoadMoreState,
} from '@/features/project/utils/loadMore';
import { buildBreadcrumbJsonLd, buildJsonLdGraph } from '@/utils/jsonLd';
import { SITE_NAME } from '@/utils/seo';

type ProjectsPageContentProps = {
   locale: Locale;
   page: number;
   lastPage?: number;
};

export async function ProjectsPageContent({
   locale,
   page,
   lastPage = page,
}: ProjectsPageContentProps) {
   const [t, last, contact] = await Promise.all([
      getTranslations({ locale, namespace: 'Projects' }),
      getProjects(locale, lastPage),
      getContact(),
   ]);

   if (lastPage > 1 && last.projects.length === 0) notFound();

   const earlier = await Promise.all(
      Array.from({ length: lastPage - page }, (_, i) => getProjects(locale, page + i)),
   );
   const { projects, totalCount } = [...earlier, last].reduce<LoadMoreState>(
      (state, next, i) =>
         i === 0
            ? initialLoadMoreState(next.projects, page, next.totalCount)
            : appendProjectsPage(state, page + i, next),
      initialLoadMoreState([], page, 0),
   );

   return (
      <>
         <JsonLd
            data={buildJsonLdGraph(
               buildBreadcrumbJsonLd(locale, [
                  { name: SITE_NAME, path: '' },
                  { name: t('title'), path: '/projects' },
               ]),
            )}
         />
         <section className="relative z-10 mb-50 w-full px-6.25">
            <SectionHeader href="/projects" title={t('title')} isPageTitle />
            <ProjectsView
               key={page}
               initialProjects={projects}
               totalCount={totalCount}
               firstPage={page}
               initialPage={lastPage}
               basePath="/projects"
            />
         </section>
         <ContactSection contact={contact} />
      </>
   );
}
