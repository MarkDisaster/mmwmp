import { describe, expect, it } from 'vitest';

import { assertProductionBuildEnv } from '../buildGuard';

const PROD = { VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://marek.media' };

describe('assertProductionBuildEnv', () => {
   it('passes the production host, with or without www', () => {
      expect(() => assertProductionBuildEnv(PROD)).not.toThrow();
      expect(() =>
         assertProductionBuildEnv({ ...PROD, NEXT_PUBLIC_SITE_URL: 'https://www.marek.media' }),
      ).not.toThrow();
   });

   it('refuses a production build with another or invalid host', () => {
      for (const url of ['https://x.vercel.app', 'nonsense', '']) {
         expect(() => assertProductionBuildEnv({ ...PROD, NEXT_PUBLIC_SITE_URL: url })).toThrow(
            /NEXT_PUBLIC_SITE_URL/,
         );
      }
      expect(() => assertProductionBuildEnv({ VERCEL_ENV: 'production' })).toThrow();
   });

   it('refuses a production build with ROBOTS_NOINDEX=true', () => {
      expect(() => assertProductionBuildEnv({ ...PROD, ROBOTS_NOINDEX: 'true' })).toThrow(
         /ROBOTS_NOINDEX/,
      );
   });

   it('passes the staging host only while it is noindex', () => {
      const staging = {
         VERCEL_ENV: 'production',
         NEXT_PUBLIC_SITE_URL: 'https://stage.marek.media',
      };
      expect(() => assertProductionBuildEnv({ ...staging, ROBOTS_NOINDEX: 'true' })).not.toThrow();
      expect(() => assertProductionBuildEnv(staging)).toThrow(/ROBOTS_NOINDEX=true/);
   });

   it('does nothing outside VERCEL_ENV=production', () => {
      const staging = { NEXT_PUBLIC_SITE_URL: 'https://stage.marek.media', ROBOTS_NOINDEX: 'true' };
      expect(() => assertProductionBuildEnv(staging)).not.toThrow();
      expect(() => assertProductionBuildEnv({ ...staging, VERCEL_ENV: 'preview' })).not.toThrow();
   });
});
