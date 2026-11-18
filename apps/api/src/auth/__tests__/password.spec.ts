import * as bcrypt from 'bcryptjs';

import { BCRYPT_COST, hashPassword, verifyPassword } from '../password';

describe('password', () => {
   it('stores a bcrypt hash of the cost that verifies only the same password', async () => {
      const hash = await hashPassword('correct horse');

      expect(bcrypt.getRounds(hash)).toBe(BCRYPT_COST);
      await expect(verifyPassword('correct horse', hash)).resolves.toBe(true);
      await expect(verifyPassword('wrong horse', hash)).resolves.toBe(false);
   });
});
