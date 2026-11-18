import { describe, expect, it } from 'vitest';

import { PROJECTS_MAX_PAGE } from '@/features/project/constants';

import { parsePage, parseProjectsPageRange, projectsPageQuerySchema } from '../utils/projectsPage';

describe('parsePage', () => {
   it('parses page 2 and above', () => {
      expect(parsePage('2')).toBe(2);
      expect(parsePage('17')).toBe(17);
      expect(parsePage(String(PROJECTS_MAX_PAGE))).toBe(PROJECTS_MAX_PAGE);
   });

   it('rejects page 1, which lives at /projects', () => {
      expect(parsePage('1')).toBeNull();
   });

   it('rejects non-canonical spellings that Number() would accept', () => {
      for (const value of ['02', '0x2', '2e0', ' 2', '2.0', '+2', '']) {
         expect(parsePage(value)).toBeNull();
      }
   });

   it('rejects zero, negatives and pages beyond the bound', () => {
      expect(parsePage('0')).toBeNull();
      expect(parsePage('-2')).toBeNull();
      expect(parsePage(String(PROJECTS_MAX_PAGE + 1))).toBeNull();
   });
});

describe('parseProjectsPageRange', () => {
   it('parses a single page as a one-page range', () => {
      expect(parseProjectsPageRange('2')).toEqual({ first: 2, last: 2 });
   });

   it('parses ranges with first < last', () => {
      expect(parseProjectsPageRange('1-2')).toEqual({ first: 1, last: 2 });
      expect(parseProjectsPageRange('1-3')).toEqual({ first: 1, last: 3 });
      expect(parseProjectsPageRange('2-3')).toEqual({ first: 2, last: 3 });
      expect(parseProjectsPageRange(`1-${PROJECTS_MAX_PAGE}`)).toEqual({
         first: 1,
         last: PROJECTS_MAX_PAGE,
      });
   });

   it('rejects everything else', () => {
      for (const value of [
         '1',
         '02',
         '1-02',
         '01-2',
         '1-1',
         '2-1',
         '1-',
         '-2',
         '1-2-3',
         'a-b',
         '0-1',
         '1,2',
         '1 -2',
         '',
         '-',
         `1-${PROJECTS_MAX_PAGE + 1}`,
      ]) {
         expect(parseProjectsPageRange(value), value).toBeNull();
      }
   });
});

describe('projectsPageQuerySchema', () => {
   it('accepts a supported locale and a page', () => {
      expect(projectsPageQuerySchema.parse({ locale: 'en', page: '3' })).toEqual({
         locale: 'en',
         page: 3,
      });
   });

   it('drops parameters the client may not choose', () => {
      expect(
         projectsPageQuerySchema.parse({
            locale: 'cs',
            page: '2',
            limit: '100',
            homepageOnly: 'true',
         }),
      ).toEqual({ locale: 'cs', page: 2 });
   });

   it('rejects an unsupported locale', () => {
      expect(projectsPageQuerySchema.safeParse({ locale: 'de', page: '2' }).success).toBe(false);
   });

   it('rejects a missing or invalid page', () => {
      expect(projectsPageQuerySchema.safeParse({ locale: 'cs' }).success).toBe(false);
      expect(projectsPageQuerySchema.safeParse({ locale: 'cs', page: '1' }).success).toBe(false);
      expect(projectsPageQuerySchema.safeParse({ locale: 'cs', page: 'abc' }).success).toBe(false);
   });
});
