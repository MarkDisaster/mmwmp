import { captureRequestError } from '@sentry/nextjs';

export async function register() {
   if (process.env.NEXT_RUNTIME !== 'nodejs') return;

   await import('@/sentry.server.config');

   const { getLegacyPreviewSecretWarning } =
      await import('@/features/draft-preview/utils/previewCredentials');
   const warning = getLegacyPreviewSecretWarning();
   if (warning) console.warn(warning);
}

export const onRequestError = captureRequestError;
