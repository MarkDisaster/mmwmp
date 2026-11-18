export const getPageNumbers = (current: number, total: number): (number | 'ellipsis')[] => {
   if (total <= 7) return Array.from({ length: total }, (_, i) => i);

   const pages: (number | 'ellipsis')[] = [0];

   if (current > 2) pages.push('ellipsis');

   const start = Math.max(1, current - 1);
   const end = Math.min(total - 2, current + 1);

   for (let i = start; i <= end; i++) pages.push(i);

   if (current < total - 3) pages.push('ellipsis');

   pages.push(total - 1);

   return pages;
};
