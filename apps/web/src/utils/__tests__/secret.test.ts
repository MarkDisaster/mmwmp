import { describe, expect, it } from 'vitest';

import { isSecretValid } from '../secret';

const SECRET = 's3cret-value';

describe('isSecretValid', () => {
   it('accepts the expected secret', () => {
      expect(isSecretValid(SECRET, SECRET)).toBe(true);
   });

   it('rejects a different secret of the same length', () => {
      expect(isSecretValid('s3cret-valuX', SECRET)).toBe(false);
   });

   it('rejects a secret of a different length without throwing', () => {
      expect(isSecretValid('short', SECRET)).toBe(false);
      expect(isSecretValid(`${SECRET}-and-more`, SECRET)).toBe(false);
   });

   it('rejects everything when no secret is configured', () => {
      expect(isSecretValid('', '')).toBe(false);
      expect(isSecretValid('anything', '')).toBe(false);
   });
});
