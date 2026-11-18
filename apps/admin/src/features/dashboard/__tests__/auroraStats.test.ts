import { describe, expect, it } from 'vitest';

import { formatCount, formatRunTime, getStartOfLocalDay } from '../utils/auroraStats';

const normalizeSpaces = (value: string) => value.replace(/\s/g, ' ');

describe('getStartOfLocalDay', () => {
   it('should return local midnight of the given moment', () => {
      const from = new Date(getStartOfLocalDay(new Date(2026, 10, 9, 23, 59, 30)));

      expect([from.getFullYear(), from.getMonth(), from.getDate()]).toEqual([2026, 10, 9]);
      expect([from.getHours(), from.getMinutes(), from.getSeconds()]).toEqual([0, 0, 0]);
   });

   it('should stay the same within a day and change after midnight', () => {
      const morning = getStartOfLocalDay(new Date(2026, 10, 9, 0, 0, 1));
      const evening = getStartOfLocalDay(new Date(2026, 10, 9, 23, 59, 59));
      const nextDay = getStartOfLocalDay(new Date(2026, 10, 10, 0, 0, 1));

      expect(morning).toBe(evening);
      expect(nextDay).not.toBe(evening);
   });
});

describe('formatCount', () => {
   it('should group thousands in the UI language', () => {
      expect(formatCount(12345, 'en')).toBe('12,345');
      expect(normalizeSpaces(formatCount(12345, 'cs'))).toBe('12 345');
   });
});

describe('formatRunTime', () => {
   it('should format seconds as m:ss', () => {
      expect(formatRunTime(75)).toBe('1:15');
      expect(formatRunTime(0)).toBe('0:00');
      expect(formatRunTime(9)).toBe('0:09');
      expect(formatRunTime(600)).toBe('10:00');
   });

   it('should keep counting minutes past an hour', () => {
      expect(formatRunTime(3600)).toBe('60:00');
      expect(formatRunTime(4505)).toBe('75:05');
   });

   it('should drop a fraction', () => {
      expect(formatRunTime(59.9)).toBe('0:59');
   });

   it('should return null for anything that is not a finite non-negative number', () => {
      expect(formatRunTime(undefined)).toBeNull();
      expect(formatRunTime(null)).toBeNull();
      expect(formatRunTime(NaN)).toBeNull();
      expect(formatRunTime(Infinity)).toBeNull();
      expect(formatRunTime(-5)).toBeNull();
   });
});
