import { createHmac } from 'crypto';

import { type PreviewTokenPayload, signPreviewToken } from '../preview-token';

const KEY = 'test-preview-url-signing-key-0123456789';
const PAYLOAD: PreviewTokenPayload = {
   resource: 'projects',
   id: 7,
   slug: 'my-project',
   locale: 'en',
   exp: 1_700_000_300,
};

const TOKEN =
   'eyJyZXNvdXJjZSI6InByb2plY3RzIiwiaWQiOjcsInNsdWciOiJteS1wcm9qZWN0IiwibG9jYWxlIjoiZW4iLCJleHAiOjE3MDAwMDAzMDB9' +
   '.NSJmsouAI95Tp-HamP21hJtiiICSyp4gCw283hBsMU8';

describe('signPreviewToken', () => {
   it('produces the token the web verifies', () => {
      expect(signPreviewToken(PAYLOAD, KEY)).toBe(TOKEN);
   });

   it('carries the payload as base64url JSON', () => {
      const [body] = signPreviewToken(PAYLOAD, KEY).split('.');

      expect(JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))).toEqual(PAYLOAD);
   });

   it('signs the payload part with HMAC-SHA256 of the key', () => {
      const [body, signature] = signPreviewToken(PAYLOAD, KEY).split('.');

      expect(signature).toBe(createHmac('sha256', KEY).update(body).digest('base64url'));
   });

   it('gives another signature with another key or another record', () => {
      const signatureOf = (token: string) => token.split('.')[1];

      expect(signatureOf(signPreviewToken(PAYLOAD, `${KEY}x`))).not.toBe(signatureOf(TOKEN));
      expect(signatureOf(signPreviewToken({ ...PAYLOAD, resource: 'services' }, KEY))).not.toBe(
         signatureOf(TOKEN),
      );
   });

   it('keeps the token URL-safe', () => {
      const token = signPreviewToken({ ...PAYLOAD, slug: 'ř?&=/+'.repeat(5) }, KEY);

      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
   });
});
