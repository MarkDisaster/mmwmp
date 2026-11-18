import { describe, expect, it } from 'vitest';

import { buildPageList, pageHref, pageRangeHref } from '../pagination';

describe('buildPageList', () => {
   it('lists every page up to seven pages', () => {
      expect(buildPageList(1, 1)).toEqual([1]);
      expect(buildPageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
   });

   it('collapses the far end on the first page', () => {
      expect(buildPageList(1, 20)).toEqual([1, 2, 'ellipsis', 20]);
   });

   it('collapses the near end on the last page', () => {
      expect(buildPageList(20, 20)).toEqual([1, 'ellipsis', 19, 20]);
   });

   it('collapses both ends in the middle', () => {
      expect(buildPageList(10, 20)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
   });

   it('shows a single hidden page instead of an ellipsis', () => {
      expect(buildPageList(4, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20]);
      expect(buildPageList(17, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20]);
   });

   it('needs no ellipsis next to the first and last page', () => {
      expect(buildPageList(2, 8)).toEqual([1, 2, 3, 'ellipsis', 8]);
      expect(buildPageList(3, 8)).toEqual([1, 2, 3, 4, 'ellipsis', 8]);
      expect(buildPageList(7, 8)).toEqual([1, 'ellipsis', 6, 7, 8]);
   });

   it('never repeats a page and keeps them in order', () => {
      for (let total = 1; total <= 30; total++) {
         for (let current = 1; current <= total; current++) {
            const pages = buildPageList(current, total).filter((item) => item !== 'ellipsis');
            expect(pages).toEqual([...new Set(pages)].sort((a, b) => a - b));
            expect(pages).toContain(1);
            expect(pages).toContain(current);
            expect(pages).toContain(total);
         }
      }
   });
});

describe('pageHref', () => {
   it('keeps page 1 on the base path', () => {
      expect(pageHref('/projects', 1)).toBe('/projects');
   });

   it('puts further pages under /page/N', () => {
      expect(pageHref('/projects', 3)).toBe('/projects/page/3');
   });
});

describe('pageRangeHref', () => {
   it('is a single page address when one page is shown', () => {
      expect(pageRangeHref('/projects', 1, 1)).toBe('/projects');
      expect(pageRangeHref('/projects', 3, 3)).toBe('/projects/page/3');
   });

   it('joins the first and the last page of a range', () => {
      expect(pageRangeHref('/projects', 1, 2)).toBe('/projects/page/1-2');
      expect(pageRangeHref('/projects', 2, 4)).toBe('/projects/page/2-4');
   });
});
