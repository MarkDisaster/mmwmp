import { matchesFingerprint, passwordFingerprint } from '../password-fingerprint';

describe('passwordFingerprint', () => {
   it('is stable for the same secret, purpose and hash', () => {
      expect(passwordFingerprint('s', 'session', 'h')).toBe(
         passwordFingerprint('s', 'session', 'h'),
      );
   });

   it('changes with the password hash, the purpose and the secret', () => {
      const base = passwordFingerprint('s', 'session', 'h');
      expect(passwordFingerprint('s', 'session', 'h2')).not.toBe(base);
      expect(passwordFingerprint('s', 'password-reset', 'h')).not.toBe(base);
      expect(passwordFingerprint('s2', 'session', 'h')).not.toBe(base);
   });

   it('does not contain the hash', () => {
      const hash = '$2b$10$abcdefghijklmnopqrstuv';
      expect(passwordFingerprint('s', 'session', hash)).not.toContain(hash);
   });
});

describe('matchesFingerprint', () => {
   const expected = passwordFingerprint('s', 'session', 'h');

   it('matches the expected fingerprint only', () => {
      expect(matchesFingerprint(expected, expected)).toBe(true);
      expect(matchesFingerprint(passwordFingerprint('s', 'session', 'x'), expected)).toBe(false);
      expect(matchesFingerprint(`${expected}x`, expected)).toBe(false);
   });

   it.each([undefined, null, 42, {}])('refuses a claim that is not a string (%p)', (claim) => {
      expect(matchesFingerprint(claim, expected)).toBe(false);
   });
});
