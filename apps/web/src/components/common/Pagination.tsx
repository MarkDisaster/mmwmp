import { cn } from '@mm/utils/cn';
import { useTranslations } from 'next-intl';

import ArrowRightSvg from '@/assets/icons/arrow-right.svg';
import { Link } from '@/i18n/navigation';
import { buildPageList, pageHref } from '@/utils/pagination';

type PaginationProps = {
   currentPage: number;
   totalPages: number;
   basePath: string;
};

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
   const t = useTranslations('Pagination');

   if (totalPages <= 1) return null;

   const pages = buildPageList(currentPage, totalPages);
   const hasPrev = currentPage > 1;
   const hasNext = currentPage < totalPages;

   return (
      <nav aria-label={t('label')} className="flex items-center gap-6.25">
         {hasPrev && (
            <Link
               href={pageHref(basePath, currentPage - 1)}
               aria-label={t('previous')}
               className="flex items-center text-foreground transition-colors hover:text-brand"
            >
               <ArrowRightSvg className="h-6 w-6 rotate-180" />
            </Link>
         )}

         {pages.map((page, idx) =>
            page === 'ellipsis' ? (
               <span key={`ellipsis-${idx}`} className="text-foreground">
                  …
               </span>
            ) : (
               <Link
                  key={page}
                  href={pageHref(basePath, page)}
                  className={cn(
                     'no-underline transition-colors',
                     page === currentPage
                        ? 'pointer-events-none font-semibold text-brand'
                        : 'text-foreground hover:text-brand',
                  )}
                  aria-current={page === currentPage ? 'page' : undefined}
               >
                  {page}
               </Link>
            ),
         )}

         {hasNext && (
            <Link
               href={pageHref(basePath, currentPage + 1)}
               aria-label={t('next')}
               className="flex items-center text-foreground transition-colors hover:text-brand"
            >
               <ArrowRightSvg className="h-6 w-6" />
            </Link>
         )}
      </nav>
   );
}
