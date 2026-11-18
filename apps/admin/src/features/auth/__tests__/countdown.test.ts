import { describe, expect, it } from 'vitest';

import { getRemainingSeconds } from '../utils/countdown';

const DEADLINE = 1_700_000_900_000;

describe('getRemainingSeconds', () => {
   it('should return the whole window right after it starts', () => {
      expect(getRemainingSeconds(DEADLINE, DEADLINE - 900_000)).toBe(900);
   });

   it('should round a partial second up', () => {
      expect(getRemainingSeconds(DEADLINE, DEADLINE - 1)).toBe(1);
      expect(getRemainingSeconds(DEADLINE, DEADLINE - 59_001)).toBe(60);
   });

   it('should derive the value from the clock, so a late tick does not drift', () => {
      expect(getRemainingSeconds(DEADLINE, DEADLINE - 900_000 + 300_000)).toBe(600);
   });

   it('should return 0 at and after the deadline', () => {
      expect(getRemainingSeconds(DEADLINE, DEADLINE)).toBe(0);
      expect(getRemainingSeconds(DEADLINE, DEADLINE + 5_000)).toBe(0);
   });
});
