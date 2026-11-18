import { describe, expect, it } from 'vitest';

import { isVersionLabel } from '../engine/phaseLabel';

describe('isVersionLabel', () => {
   it('recognises a maintenance version', () => {
      expect(isVersionLabel('v1.0')).toBe(true);
      expect(isVersionLabel('v12.34')).toBe(true);
   });

   it('does not take a phase id or the delivered label for a version', () => {
      expect(isVersionLabel('delivered')).toBe(false);
      expect(isVersionLabel('planning')).toBe(false);
   });
});
