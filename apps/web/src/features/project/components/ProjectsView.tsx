'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/common/Button';
import { Pagination } from '@/components/common/Pagination';
import { PROJECTS_PAGE_LIMIT } from '@/features/project/constants';
import {
   appendProjectsPage,
   hasNextPage,
   initialLoadMoreState,
   loadMoreTotalPages,
} from '@/features/project/utils/loadMore';
import type { ProjectCardData, ProjectCardsPage } from '@/features/project/utils/projectCard';
import { useRouter } from '@/i18n/navigation';
import { pageRangeHref } from '@/utils/pagination';

import { ProjectList } from './ProjectList';

type ProjectsViewProps = {
   initialProjects: ProjectCardData[];
   totalCount: number;
   firstPage?: number;
   initialPage: number;
   basePath: string;
};

export function ProjectsView({
   initialProjects,
   totalCount,
   firstPage: firstPageProp,
   initialPage,
   basePath,
}: ProjectsViewProps) {
   const t = useTranslations('Projects');
   const firstPage = firstPageProp ?? initialPage;
   const locale = useLocale();
   const router = useRouter();
   const [list, setList] = useState(() =>
      initialLoadMoreState(initialProjects, initialPage, totalCount),
   );
   const [loadFailed, setLoadFailed] = useState(false);
   const [isPending, startTransition] = useTransition();

   const totalPages = loadMoreTotalPages(list);
   const canLoadMore = hasNextPage(list);

   const fetchPage = async (page: number): Promise<ProjectCardsPage> => {
      const query = new URLSearchParams({ locale, page: String(page) });
      const response = await fetch(`/api/projects?${query}`);
      if (!response.ok) throw new Error(`GET /api/projects answered ${response.status}`);
      return (await response.json()) as ProjectCardsPage;
   };

   const handleLoadMore = () => {
      if (isPending) return;
      const page = list.lastPage + 1;
      setLoadFailed(false);

      startTransition(async () => {
         try {
            const next = await fetchPage(page);
            startTransition(() => setList((prev) => appendProjectsPage(prev, page, next)));
            if (next.projects.length > 0) {
               router.replace(pageRangeHref(basePath, firstPage, page), { scroll: false });
            }
         } catch (error) {
            console.error('Failed to load more projects:', error);
            startTransition(() => setLoadFailed(true));
         }
      });
   };

   return (
      <>
         <ProjectList projects={list.projects} offset={(firstPage - 1) * PROJECTS_PAGE_LIMIT} />

         {(canLoadMore || totalPages > 1) && (
            <div className="mt-25 grid grid-cols-3 items-center gap-8">
               <span />
               <div className="flex flex-col items-center gap-4">
                  {canLoadMore && (
                     <Button size="sm" onClick={handleLoadMore} isPending={isPending}>
                        {isPending ? t('loadingMore') : t('loadMore')}
                     </Button>
                  )}
                  {loadFailed && (
                     <p role="alert" className="text-center text-sm">
                        {t('loadMoreError')}
                     </p>
                  )}
               </div>
               <div className="flex justify-end">
                  <Pagination
                     currentPage={list.lastPage}
                     totalPages={totalPages}
                     basePath={basePath}
                  />
               </div>
            </div>
         )}
      </>
   );
}
