import { describe, expect, it } from 'vitest';

import {
   countFilledLinks,
   focusIndexAfterRemove,
   hasFilledLink,
   toFormLinks,
   toProjectLinks,
} from '../utils/projectLinks';

const WEB = { label: 'Web', url: 'https://example.com' };
const GITHUB = { label: 'GitHub', url: 'https://github.com/example/repo' };

describe('toProjectLinks', () => {
   it('should keep the form order, trim the values and store a blank label as null', () => {
      expect(
         toProjectLinks([
            { label: ' GitHub ', url: ' https://github.com/example/repo ' },
            { label: '  ', url: WEB.url },
         ]),
      ).toEqual([GITHUB, { label: null, url: WEB.url }]);
   });

   it('should drop rows without a URL', () => {
      expect(toProjectLinks([{ label: 'Empty', url: '  ' }, WEB])).toEqual([WEB]);
   });

   it('should store a new row, which has no label, with a null label', () => {
      expect(toProjectLinks([{ label: '', url: WEB.url }])).toEqual([
         { label: null, url: WEB.url },
      ]);
      expect(toProjectLinks([{ url: WEB.url }])).toEqual([{ label: null, url: WEB.url }]);
   });
});

describe('countFilledLinks', () => {
   it('should not count the starter row, blank URLs or added empty rows', () => {
      expect(countFilledLinks(toFormLinks([]))).toBe(0);
      expect(countFilledLinks([{ label: 'Stored', url: ' ' }])).toBe(0);
      expect(countFilledLinks([...toFormLinks([WEB, GITHUB]), { label: '', url: '' }])).toBe(2);
   });
});

describe('hasFilledLink', () => {
   it('should be false for the starter row and for rows with a blank URL', () => {
      expect(hasFilledLink(toFormLinks([]))).toBe(false);
      expect(
         hasFilledLink([
            { label: 'Stored', url: ' ' },
            { label: '', url: '' },
         ]),
      ).toBe(false);
   });

   it('should be true as soon as one row has a URL', () => {
      expect(hasFilledLink(toFormLinks([WEB]))).toBe(true);
      expect(
         hasFilledLink([
            { label: '', url: '' },
            { label: '', url: WEB.url },
         ]),
      ).toBe(true);
   });
});

describe('focusIndexAfterRemove', () => {
   it('should focus the row that took the place of the removed one', () => {
      expect(focusIndexAfterRemove(1, 2)).toBe(1);
      expect(focusIndexAfterRemove(0, 3)).toBe(0);
   });

   it('should focus the new last row when the last row was removed', () => {
      expect(focusIndexAfterRemove(2, 2)).toBe(1);
   });

   it('should focus the only row left', () => {
      expect(focusIndexAfterRemove(0, 1)).toBe(0);
      expect(focusIndexAfterRemove(1, 1)).toBe(0);
   });

   it('should focus the first row (the empty one) when no row is left', () => {
      expect(focusIndexAfterRemove(0, 0)).toBe(0);
   });
});

describe('toFormLinks', () => {
   it('should give a project without links one empty row', () => {
      expect(toFormLinks(undefined)).toEqual([{ label: '', url: '' }]);
      expect(toFormLinks([])).toEqual([{ label: '', url: '' }]);
   });

   it('should map the saved links in their order with an empty label for none', () => {
      expect(toFormLinks([GITHUB, { label: null, url: WEB.url }])).toEqual([
         GITHUB,
         { label: '', url: WEB.url },
      ]);
   });

   it('should give a project with links exactly its links, without an empty row', () => {
      expect(toFormLinks([WEB])).toEqual([WEB]);
      expect(toFormLinks([WEB, GITHUB])).toHaveLength(2);
   });

   it('should not share the empty row between calls', () => {
      expect(toFormLinks([])[0]).not.toBe(toFormLinks([])[0]);
   });

   it('should save nothing for the untouched empty row of a project without links', () => {
      expect(toProjectLinks(toFormLinks([]))).toEqual([]);
   });

   it('should keep the stored labels when the links are saved unchanged', () => {
      const saved = [GITHUB, { label: null, url: WEB.url }];
      expect(toProjectLinks(toFormLinks(saved))).toEqual(saved);
   });

   it('should keep the label of a link whose URL was edited', () => {
      const rows = toFormLinks([GITHUB]);
      rows[0].url = 'https://github.com/example/other';

      expect(toProjectLinks(rows)).toEqual([
         { label: 'GitHub', url: 'https://github.com/example/other' },
      ]);
   });
});
