import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDate, formatDateTime, formatRelativeDate } from '../date';

const NOW = new Date('2026-11-09T12:00:00Z');

const ago = (ms: number) => new Date(NOW.getTime() - ms);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeDate', () => {
   beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
   });

   afterEach(() => {
      vi.useRealTimers();
   });

   it('should say now for less than a minute and for a date in the future', () => {
      expect(formatRelativeDate(ago(59_000), 'en')).toBe('now');
      expect(formatRelativeDate(ago(-HOUR), 'en')).toBe('now');
      expect(formatRelativeDate(ago(0), 'cs')).toBe('nyní');
   });

   it('should count whole minutes, hours and days', () => {
      expect(formatRelativeDate(ago(MINUTE), 'en')).toBe('1 minute ago');
      expect(formatRelativeDate(ago(59 * MINUTE + 59_000), 'en')).toBe('59 minutes ago');
      expect(formatRelativeDate(ago(HOUR), 'en')).toBe('1 hour ago');
      expect(formatRelativeDate(ago(23 * HOUR + 59 * MINUTE), 'en')).toBe('23 hours ago');
      expect(formatRelativeDate(ago(6 * DAY), 'en')).toBe('6 days ago');
   });

   it('should name the previous day and decline the units in Czech', () => {
      expect(formatRelativeDate(ago(DAY), 'en')).toBe('yesterday');
      expect(formatRelativeDate(ago(DAY), 'cs')).toBe('včera');
      expect(formatRelativeDate(ago(5 * MINUTE), 'cs')).toBe('před 5 minutami');
      expect(formatRelativeDate(ago(3 * HOUR), 'cs')).toBe('před 3 hodinami');
   });

   it('should show the date itself from a week back', () => {
      const date = ago(7 * DAY);
      expect(formatRelativeDate(date, 'cs')).toBe(date.toLocaleDateString('cs'));
      expect(formatRelativeDate(date.toISOString(), 'en')).toBe(date.toLocaleDateString('en'));
   });

   it('should show a dash for an invalid date', () => {
      expect(formatRelativeDate('not a date', 'en')).toBe('—');
   });
});

describe('formatDateTime', () => {
   const date = new Date(2026, 10, 13, 9, 5, 9);
   const plain = (text: string) => text.replace(/\s/g, ' ');

   it('should write the date as formatDate does, followed by the time to the second', () => {
      expect(plain(formatDateTime(date, 'cs'))).toBe('13. 11. 2026 9:05:09');
      expect(plain(formatDateTime(date, 'en'))).toBe('11/13/2026, 9:05:09 AM');
      expect(formatDateTime(date, 'cs').startsWith(formatDate(date, 'cs'))).toBe(true);
   });

   it('should tell apart two entries of the same day', () => {
      const later = new Date(2026, 10, 13, 9, 5, 10);
      expect(formatDate(later, 'cs')).toBe(formatDate(date, 'cs'));
      expect(formatDateTime(later.toISOString(), 'cs')).not.toBe(formatDateTime(date, 'cs'));
   });
});
