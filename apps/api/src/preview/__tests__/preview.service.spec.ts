import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PreviewService } from '../preview.service';
import { PREVIEW_TOKEN_TTL_SECONDS, signPreviewToken } from '../preview-token';

const WEB_URL = 'https://web.test';
const SIGNING_KEY = 'url-signing-key-of-at-least-32-characters';
const API_TOKEN = 'api-token-of-at-least-32-characters-long';
const LEGACY = 'legacy-preview-secret';
const NOW = Date.UTC(2026, 10, 9, 12, 0, 0);

type PreviewEnv = {
   previewUrlSigningKey?: string;
   previewApiToken?: string;
   previewSecret?: string;
};

const createService = (auth: PreviewEnv) =>
   new PreviewService(new ConfigService({ app: { webUrl: WEB_URL }, auth }));

const PROJECT = { id: 7, slug: 'my-project' };

describe('PreviewService', () => {
   describe('getPreviewUrl with PREVIEW_URL_SIGNING_KEY', () => {
      const service = createService({
         previewUrlSigningKey: SIGNING_KEY,
         previewApiToken: API_TOKEN,
         previewSecret: LEGACY,
      });

      it('links the draft route with a token signed for the record, language and 5 minutes', () => {
         const url = new URL(service.getPreviewUrl('projects', PROJECT, 'en', NOW));

         expect(`${url.origin}${url.pathname}`).toBe(`${WEB_URL}/api/draft`);
         expect([...url.searchParams.keys()]).toEqual(['token']);
         expect(url.searchParams.get('token')).toBe(
            signPreviewToken(
               {
                  resource: 'projects',
                  id: 7,
                  slug: 'my-project',
                  locale: 'en',
                  exp: NOW / 1000 + PREVIEW_TOKEN_TTL_SECONDS,
               },
               SIGNING_KEY,
            ),
         );
      });

      it('never puts a secret into the URL', () => {
         const url = service.getPreviewUrl('services', PROJECT, 'cs', NOW);

         for (const secret of [SIGNING_KEY, API_TOKEN, LEGACY]) {
            expect(url).not.toContain(secret);
            expect(url).not.toContain(encodeURIComponent(secret));
         }
      });

      it('expires 300 seconds after now, rounded down to a whole second', () => {
         const url = new URL(service.getPreviewUrl('projects', PROJECT, 'cs', NOW + 999));
         const [body] = (url.searchParams.get('token') ?? '').split('.');

         expect(JSON.parse(Buffer.from(body, 'base64url').toString('utf8')).exp).toBe(
            NOW / 1000 + 300,
         );
      });
   });

   describe('getPreviewUrl without PREVIEW_URL_SIGNING_KEY (legacy fallback)', () => {
      it('links with PREVIEW_SECRET as before', () => {
         const service = createService({ previewApiToken: API_TOKEN, previewSecret: LEGACY });

         expect(service.getPreviewUrl('services', { id: 3, slug: 'web' }, 'en', NOW)).toBe(
            `${WEB_URL}/api/draft?secret=${LEGACY}&slug=web&type=services&locale=en`,
         );
      });

      it('encodes the query values', () => {
         const service = createService({ previewSecret: 'a&b=c' });

         const url = new URL(service.getPreviewUrl('projects', PROJECT, 'x&y', NOW));

         expect(url.searchParams.get('secret')).toBe('a&b=c');
         expect(url.searchParams.get('locale')).toBe('x&y');
      });
   });

   describe('onModuleInit', () => {
      let warn: jest.SpyInstance;

      beforeEach(() => {
         warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      });
      afterEach(() => warn.mockRestore());

      it('stays silent without PREVIEW_SECRET', () => {
         createService({
            previewUrlSigningKey: SIGNING_KEY,
            previewApiToken: API_TOKEN,
         }).onModuleInit();

         expect(warn).not.toHaveBeenCalled();
      });

      it.each([
         [
            'both new values unset',
            {},
            ['PREVIEW_URL_SIGNING_KEY unset', 'PREVIEW_API_TOKEN unset'],
         ],
         [
            'only the signing key set',
            { previewUrlSigningKey: SIGNING_KEY },
            ['PREVIEW_API_TOKEN unset'],
         ],
         [
            'both new values set',
            { previewUrlSigningKey: SIGNING_KEY, previewApiToken: API_TOKEN },
            ['still accepted as the draft API token'],
         ],
      ])(
         'warns once, without a value, while PREVIEW_SECRET is set (%s)',
         (_case, auth, reasons) => {
            createService({ ...auth, previewSecret: LEGACY }).onModuleInit();

            expect(warn).toHaveBeenCalledTimes(1);
            const message = warn.mock.calls[0][0] as string;
            for (const reason of reasons) expect(message).toContain(reason);
            for (const secret of [LEGACY, SIGNING_KEY, API_TOKEN])
               expect(message).not.toContain(secret);
         },
      );
   });
});
