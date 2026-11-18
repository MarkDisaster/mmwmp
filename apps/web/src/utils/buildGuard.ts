const PRODUCTION_HOSTS = ['marek.media', 'www.marek.media'];

const STAGING_HOST = 'stage.marek.media';

type BuildEnv = {
   VERCEL_ENV?: string;
   NEXT_PUBLIC_SITE_URL?: string;
   ROBOTS_NOINDEX?: string;
};

export function assertProductionBuildEnv({
   VERCEL_ENV,
   NEXT_PUBLIC_SITE_URL,
   ROBOTS_NOINDEX,
}: BuildEnv): void {
   if (VERCEL_ENV !== 'production') return;

   const host = NEXT_PUBLIC_SITE_URL ? safeHost(NEXT_PUBLIC_SITE_URL) : null;
   if (host === STAGING_HOST) {
      if (ROBOTS_NOINDEX !== 'true') {
         throw new Error(
            `Staging build refused: ${STAGING_HOST} needs ROBOTS_NOINDEX=true, otherwise the staging site would be indexed.`,
         );
      }
      return;
   }
   if (!host || !PRODUCTION_HOSTS.includes(host)) {
      throw new Error(
         `Production build refused: NEXT_PUBLIC_SITE_URL must be https://marek.media (or www), got "${NEXT_PUBLIC_SITE_URL ?? ''}". It sets the canonical, hreflang and sitemap host.`,
      );
   }

   if (ROBOTS_NOINDEX === 'true') {
      throw new Error(
         'Production build refused: ROBOTS_NOINDEX=true would noindex the production site. Unset it (staging only).',
      );
   }
}

const safeHost = (url: string): string | null => {
   try {
      return new URL(url).hostname;
   } catch {
      return null;
   }
};
