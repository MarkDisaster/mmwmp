import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
   server: {
      ROBOTS_NOINDEX: z.enum(['true', 'false']).optional(),
      PREVIEW_URL_SIGNING_KEY: z.string().min(32).optional(),
      PREVIEW_API_TOKEN: z.string().min(32).optional(),
      PREVIEW_SECRET: z.string().optional(),
      REVALIDATE_SECRET: z.string().min(32, 'REVALIDATE_SECRET: at least 32 characters').optional(),
      SENTRY_DSN: z.string().url().optional(),
      SENTRY_ENVIRONMENT: z.string().optional(),
      VERCEL_GIT_COMMIT_SHA: z.string().optional(),
   },
   client: {
      NEXT_PUBLIC_SITE_URL: z.string().url(),
      NEXT_PUBLIC_API_URL: z.string().url(),
   },
   runtimeEnv: {
      ROBOTS_NOINDEX: process.env.ROBOTS_NOINDEX,
      PREVIEW_URL_SIGNING_KEY: process.env.PREVIEW_URL_SIGNING_KEY,
      PREVIEW_API_TOKEN: process.env.PREVIEW_API_TOKEN,
      PREVIEW_SECRET: process.env.PREVIEW_SECRET,
      REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
      SENTRY_DSN: process.env.SENTRY_DSN,
      SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
   },
   emptyStringAsUndefined: true,
});
