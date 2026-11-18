import { describe, expect, it } from 'vitest';

import { formatProjectYears, getProjectYears } from '../utils/projectYears';

const NOW = 2027;

describe('getProjectYears', () => {
   it('shows the start year alone when there is no end year and the project is not running', () => {
      expect(getProjectYears({ startYear: 2024, endYear: null, ongoing: false }, NOW)).toEqual({
         from: 2024,
         to: null,
      });
   });

   it('shows the start and the end year of a finished project', () => {
      expect(getProjectYears({ startYear: 2023, endYear: 2025, ongoing: false }, NOW)).toEqual({
         from: 2023,
         to: 2025,
      });
   });

   it('shows the current year as the end of a running project, never a word', () => {
      expect(getProjectYears({ startYear: 2024, endYear: null, ongoing: true }, NOW)).toEqual({
         from: 2024,
         to: NOW,
      });
   });

   it('collapses the years that are the same', () => {
      expect(getProjectYears({ startYear: 2024, endYear: 2024, ongoing: false }, NOW)).toEqual({
         from: 2024,
         to: null,
      });
      expect(getProjectYears({ startYear: NOW, endYear: null, ongoing: true }, NOW)).toEqual({
         from: NOW,
         to: null,
      });
   });

   it('never ends a running project before it starts', () => {
      expect(getProjectYears({ startYear: 2030, endYear: null, ongoing: true }, NOW)).toEqual({
         from: 2030,
         to: null,
      });
   });

   it('has no years without a start year, also when the fields are missing', () => {
      expect(getProjectYears({ startYear: null, endYear: null, ongoing: false }, NOW)).toBeNull();
      expect(getProjectYears({}, NOW)).toBeNull();
   });

   it('treats a flag missing from a cached response like a project that is not running', () => {
      expect(getProjectYears({ startYear: 2024, endYear: 2025 }, NOW)).toEqual({
         from: 2024,
         to: 2025,
      });
   });
});

describe('formatProjectYears', () => {
   it('joins two years with an en dash and prints one year alone', () => {
      expect(formatProjectYears({ from: 2023, to: 2026 })).toBe('2023–2026');
      expect(formatProjectYears({ from: 2024, to: null })).toBe('2024');
   });
});
