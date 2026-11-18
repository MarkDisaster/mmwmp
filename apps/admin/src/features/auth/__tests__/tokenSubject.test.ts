import { describe, expect, it } from 'vitest';

import { getTokenSubject } from '../utils/tokenSubject';

const toBase64Url = (value: string) =>
   btoa(value).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');

const tokenWith = (claims: unknown) => `header.${toBase64Url(JSON.stringify(claims))}.signature`;

describe('getTokenSubject', () => {
   it('should read a numeric subject as a string', () => {
      expect(getTokenSubject(tokenWith({ sub: 42, email: 'a@b.c' }))).toBe('42');
   });

   it('should read a base64url payload with characters base64 encodes as + and /', () => {
      const sub = 'user?>>~';
      expect(toBase64Url(JSON.stringify({ sub }))).toMatch(/[-_]/u);
      expect(getTokenSubject(tokenWith({ sub }))).toBe(sub);
   });

   it('should return null for a token without a subject', () => {
      expect(getTokenSubject(tokenWith({ email: 'a@b.c' }))).toBeNull();
      expect(getTokenSubject(tokenWith(null))).toBeNull();
   });

   it('should return null for a malformed token', () => {
      expect(getTokenSubject('not-a-jwt')).toBeNull();
      expect(getTokenSubject('header.%%%.signature')).toBeNull();
   });
});
