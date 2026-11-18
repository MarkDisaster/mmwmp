import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';

import { verifyPreviewToken } from '../previewToken';

const KEY = 'test-preview-url-signing-key-0123456789';
const PAYLOAD = {
   resource: 'projects',
   id: 7,
   slug: 'my-project',
   locale: 'en',
   exp: 1_700_000_300,
};
const BEFORE_EXPIRY = (PAYLOAD.exp - 1) * 1000;

const TOKEN =
   'eyJyZXNvdXJjZSI6InByb2plY3RzIiwiaWQiOjcsInNsdWciOiJteS1wcm9qZWN0IiwibG9jYWxlIjoiZW4iLCJleHAiOjE3MDAwMDAzMDB9' +
   '.NSJmsouAI95Tp-HamP21hJtiiICSyp4gCw283hBsMU8';

const sign = (payload: unknown, key = KEY) => {
   const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
   return `${body}.${createHmac('sha256', key).update(body).digest('base64url')}`;
};

describe('verifyPreviewToken', () => {
   it('returns the payload of a token the API signed', () => {
      expect(verifyPreviewToken(TOKEN, KEY, BEFORE_EXPIRY)).toEqual(PAYLOAD);
   });

   it('refuses the token from its expiry on', () => {
      expect(verifyPreviewToken(TOKEN, KEY, PAYLOAD.exp * 1000)).toBeNull();
      expect(verifyPreviewToken(TOKEN, KEY, PAYLOAD.exp * 1000 + 60_000)).toBeNull();
   });

   it('refuses a token signed with another key', () => {
      expect(verifyPreviewToken(sign(PAYLOAD, `${KEY}x`), KEY, BEFORE_EXPIRY)).toBeNull();
      expect(verifyPreviewToken(TOKEN, `${KEY}x`, BEFORE_EXPIRY)).toBeNull();
   });

   it('refuses a payload changed after signing (other record, resource or later expiry)', () => {
      const [, signature] = TOKEN.split('.');
      const forge = (changes: object) =>
         `${Buffer.from(JSON.stringify({ ...PAYLOAD, ...changes })).toString('base64url')}.${signature}`;

      expect(verifyPreviewToken(forge({ slug: 'other' }), KEY, BEFORE_EXPIRY)).toBeNull();
      expect(verifyPreviewToken(forge({ resource: 'services' }), KEY, BEFORE_EXPIRY)).toBeNull();
      expect(verifyPreviewToken(forge({ exp: PAYLOAD.exp + 3600 }), KEY, BEFORE_EXPIRY)).toBeNull();
   });

   it('refuses a changed or truncated signature', () => {
      const [body, signature] = TOKEN.split('.');
      const flipped = `${signature.slice(0, -1)}${signature.endsWith('A') ? 'B' : 'A'}`;

      expect(verifyPreviewToken(`${body}.${flipped}`, KEY, BEFORE_EXPIRY)).toBeNull();
      expect(
         verifyPreviewToken(`${body}.${signature.slice(0, -1)}`, KEY, BEFORE_EXPIRY),
      ).toBeNull();
      expect(verifyPreviewToken(`${body}.${signature}=`, KEY, BEFORE_EXPIRY)).toBeNull();
   });

   it('refuses a signed payload with an unknown resource', () => {
      expect(
         verifyPreviewToken(sign({ ...PAYLOAD, resource: 'users' }), KEY, BEFORE_EXPIRY),
      ).toBeNull();
   });

   it.each([
      ['an incomplete payload', sign({ resource: 'projects', slug: 'x', exp: PAYLOAD.exp })],
      [
         'a payload that is not JSON',
         `bm90LWpzb24.${createHmac('sha256', KEY).update('bm90LWpzb24').digest('base64url')}`,
      ],
      ['an empty string', ''],
      ['no signature', TOKEN.split('.')[0]],
      ['three parts', `${TOKEN}.x`],
   ])('refuses %s', (_case, token) => {
      expect(verifyPreviewToken(token, KEY, BEFORE_EXPIRY)).toBeNull();
   });

   it('matches nothing with an empty key', () => {
      expect(verifyPreviewToken(sign(PAYLOAD, ''), '', BEFORE_EXPIRY)).toBeNull();
   });
});
