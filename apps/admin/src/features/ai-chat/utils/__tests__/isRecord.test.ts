import { describe, expect, it } from 'vitest';

import { isRecord } from '../isRecord';

describe('isRecord', () => {
   it('should accept a plain object only', () => {
      expect(isRecord({ id: 1 })).toBe(true);
      expect(isRecord({})).toBe(true);
      expect(isRecord([])).toBe(false);
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord('id')).toBe(false);
      expect(isRecord(1)).toBe(false);
   });
});
