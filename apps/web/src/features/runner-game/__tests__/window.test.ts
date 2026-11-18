import { describe, expect, it } from 'vitest';

import { windowLength } from './helpers';

const NEEDED = 11;
const BUFFER = 12;
const moments = (pattern: string) => [...pattern].map((c) => c === '#');

describe('reaction window', () => {
   it('credits the jump buffer when a jump on touchdown works', () => {
      expect(windowLength(moments('#'), NEEDED, BUFFER)).toBe(NEEDED);
   });

   it('gives no buffer credit when only a moment after touchdown works', () => {
      expect(windowLength(moments('..#...'), NEEDED, BUFFER)).toBe(1);
   });

   it('keeps a frame or two of failures inside a window, without counting them', () => {
      expect(windowLength(moments('######..#####'), NEEDED)).toBe(NEEDED);
      expect(windowLength(moments('#####...#####'), NEEDED)).toBe(5);
   });

   it('takes the widest window, wherever it lies', () => {
      expect(windowLength(moments('##.....#########...##'), NEEDED)).toBe(9);
   });
});
