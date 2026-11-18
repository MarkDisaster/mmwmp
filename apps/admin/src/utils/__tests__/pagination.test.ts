import { describe, expect, it } from 'vitest';

import { getPageNumbers } from '../pagination';

describe('getPageNumbers', () => {
   it('should list every page up to seven pages', () => {
      expect(getPageNumbers(0, 0)).toEqual([]);
      expect(getPageNumbers(0, 1)).toEqual([0]);
      expect(getPageNumbers(3, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
   });

   it('should keep the first pages together while the current page is near the start', () => {
      expect(getPageNumbers(0, 10)).toEqual([0, 1, 'ellipsis', 9]);
      expect(getPageNumbers(2, 10)).toEqual([0, 1, 2, 3, 'ellipsis', 9]);
   });

   it('should show the neighbours of the current page between two gaps in the middle', () => {
      expect(getPageNumbers(5, 10)).toEqual([0, 'ellipsis', 4, 5, 6, 'ellipsis', 9]);
   });

   it('should keep the last pages together while the current page is near the end', () => {
      expect(getPageNumbers(7, 10)).toEqual([0, 'ellipsis', 6, 7, 8, 9]);
      expect(getPageNumbers(9, 10)).toEqual([0, 'ellipsis', 8, 9]);
   });
});
