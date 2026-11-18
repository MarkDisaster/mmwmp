import { env } from '@/env';

export const getPreviewAuthorization = () =>
   `Bearer ${env.PREVIEW_API_TOKEN ?? env.PREVIEW_SECRET ?? ''}`;

export const getLegacyPreviewSecretWarning = (): string | null => {
   if (!env.PREVIEW_SECRET) return null;

   const uses = [
      env.PREVIEW_URL_SIGNING_KEY
         ? 'legacy ?secret= preview links are still accepted next to the signed ones'
         : 'only legacy ?secret= preview links are accepted (PREVIEW_URL_SIGNING_KEY unset)',
   ];
   if (!env.PREVIEW_API_TOKEN) uses.push('it is sent to the API (PREVIEW_API_TOKEN unset)');

   return (
      `PREVIEW_SECRET is deprecated and still in use: ${uses.join('; ')}. ` +
      'Remove it once PREVIEW_URL_SIGNING_KEY and PREVIEW_API_TOKEN are set on the web and the API.'
   );
};
