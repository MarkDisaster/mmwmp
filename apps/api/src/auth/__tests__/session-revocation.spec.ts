import { isIssuedBeforeValidAfter } from '../session-revocation';

describe('isIssuedBeforeValidAfter', () => {
   const validAfter = new Date('2026-11-09T10:00:00.700Z');
   const second = Math.floor(validAfter.getTime() / 1000);

   it('voids nothing for a user whose tokens were never voided', () => {
      expect(isIssuedBeforeValidAfter(second - 3600, null)).toBe(false);
      expect(isIssuedBeforeValidAfter(second - 3600, undefined)).toBe(false);
   });

   it('voids a token issued before, or in the second of, the cut', () => {
      expect(isIssuedBeforeValidAfter(second - 1, validAfter)).toBe(true);
      expect(isIssuedBeforeValidAfter(second, validAfter)).toBe(true);
   });

   it('keeps a token issued in a later second', () => {
      expect(isIssuedBeforeValidAfter(second + 1, validAfter)).toBe(false);
   });

   it('voids a token without a usable iat once a cut is set', () => {
      expect(isIssuedBeforeValidAfter(undefined, validAfter)).toBe(true);
      expect(isIssuedBeforeValidAfter('1', validAfter)).toBe(true);
   });
});
