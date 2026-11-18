import { SLUG_REGEX } from '@/common/schema/slug';

import { daysLeftInTrash, toTrashedItem, trashedSlug } from '../trash';

const DAY = 86_400_000;
const NOW = new Date('2026-06-30T12:00:00.000Z');

describe('trashedSlug', () => {
   it('keeps the original, adds the id and never matches a valid slug', () => {
      expect(trashedSlug('my-project', 7)).toBe('my-project--trashed-7');
      expect(SLUG_REGEX.test(trashedSlug('my-project', 7))).toBe(false);
   });

   it('gives two trashed rows with the same original different slugs', () => {
      expect(trashedSlug('a', 1)).not.toBe(trashedSlug('a', 2));
   });
});

describe('daysLeftInTrash', () => {
   it('counts the whole retention for a row trashed just now', () => {
      expect(daysLeftInTrash(NOW, 30, NOW)).toBe(30);
   });

   it('rounds a started day up, so the last day reads 1 until the purge is due', () => {
      expect(daysLeftInTrash(new Date(NOW.getTime() - 29.5 * DAY), 30, NOW)).toBe(1);
      expect(daysLeftInTrash(new Date(NOW.getTime() - 10 * DAY), 30, NOW)).toBe(20);
   });

   it('is 0 when the retention has passed', () => {
      expect(daysLeftInTrash(new Date(NOW.getTime() - 30 * DAY), 30, NOW)).toBe(0);
      expect(daysLeftInTrash(new Date(NOW.getTime() - 90 * DAY), 30, NOW)).toBe(0);
   });
});

describe('toTrashedItem', () => {
   it('maps a row with the days left and a null slug for a row without one', () => {
      const deletedAt = new Date(NOW.getTime() - 5 * DAY);

      expect(
         toTrashedItem({ id: 4, title: 'hero.jpg', deletedAt, deletedBy: null }, 30, NOW),
      ).toEqual({
         id: 4,
         title: 'hero.jpg',
         originalSlug: null,
         deletedAt,
         deletedBy: null,
         daysLeft: 25,
      });
   });
});
