export type PageListItem = number | 'ellipsis';

const SIBLINGS = 1;
const MAX_FULL_LIST = 7;

export function buildPageList(currentPage: number, totalPages: number): PageListItem[] {
   if (totalPages <= MAX_FULL_LIST) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
   }

   const start = Math.max(1, currentPage - SIBLINGS);
   const end = Math.min(totalPages, currentPage + SIBLINGS);
   const pages: PageListItem[] = [];

   if (start > 1) pages.push(1);
   if (start === 3) pages.push(2);
   if (start > 3) pages.push('ellipsis');

   for (let page = start; page <= end; page++) pages.push(page);

   if (end < totalPages - 2) pages.push('ellipsis');
   if (end === totalPages - 2) pages.push(totalPages - 1);
   if (end < totalPages) pages.push(totalPages);

   return pages;
}

export const pageHref = (basePath: string, page: number) =>
   page === 1 ? basePath : `${basePath}/page/${page}`;

export const pageRangeHref = (basePath: string, first: number, last: number) =>
   first === last ? pageHref(basePath, first) : `${basePath}/page/${first}-${last}`;
