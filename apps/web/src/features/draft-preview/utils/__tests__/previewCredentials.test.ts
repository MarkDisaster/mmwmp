import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLegacyPreviewSecretWarning, getPreviewAuthorization } from '../previewCredentials';

const env = vi.hoisted(
   () =>
      ({}) as {
         PREVIEW_URL_SIGNING_KEY?: string;
         PREVIEW_API_TOKEN?: string;
         PREVIEW_SECRET?: string;
      },
);
vi.mock('@/env', () => ({ env }));

const SIGNING_KEY = 'url-signing-key-of-at-least-32-characters';
const API_TOKEN = 'api-token-of-at-least-32-characters-long';
const LEGACY = 'legacy-preview-secret';

describe('previewCredentials', () => {
   afterEach(() => {
      delete env.PREVIEW_URL_SIGNING_KEY;
      delete env.PREVIEW_API_TOKEN;
      delete env.PREVIEW_SECRET;
   });

   describe('getPreviewAuthorization', () => {
      it('sends PREVIEW_API_TOKEN, never the legacy secret next to it', () => {
         Object.assign(env, { PREVIEW_API_TOKEN: API_TOKEN, PREVIEW_SECRET: LEGACY });

         expect(getPreviewAuthorization()).toBe(`Bearer ${API_TOKEN}`);
      });

      it('falls back to PREVIEW_SECRET while PREVIEW_API_TOKEN is unset', () => {
         Object.assign(env, { PREVIEW_SECRET: LEGACY });

         expect(getPreviewAuthorization()).toBe(`Bearer ${LEGACY}`);
      });

      it('sends an empty token when nothing is configured (the API then serves no drafts)', () => {
         expect(getPreviewAuthorization()).toBe('Bearer ');
      });
   });

   describe('getLegacyPreviewSecretWarning', () => {
      it('is null without PREVIEW_SECRET', () => {
         Object.assign(env, { PREVIEW_URL_SIGNING_KEY: SIGNING_KEY, PREVIEW_API_TOKEN: API_TOKEN });

         expect(getLegacyPreviewSecretWarning()).toBeNull();
      });

      it.each([
         [
            'both new values unset',
            {},
            ['PREVIEW_URL_SIGNING_KEY unset', 'PREVIEW_API_TOKEN unset'],
         ],
         [
            'both new values set',
            { PREVIEW_URL_SIGNING_KEY: SIGNING_KEY, PREVIEW_API_TOKEN: API_TOKEN },
            ['still accepted next to the signed ones'],
         ],
      ])(
         'says what PREVIEW_SECRET is still used for (%s), without a value',
         (_case, values, reasons) => {
            Object.assign(env, { ...values, PREVIEW_SECRET: LEGACY });

            const warning = getLegacyPreviewSecretWarning() ?? '';

            for (const reason of reasons) expect(warning).toContain(reason);
            for (const secret of [LEGACY, SIGNING_KEY, API_TOKEN])
               expect(warning).not.toContain(secret);
         },
      );
   });
});
