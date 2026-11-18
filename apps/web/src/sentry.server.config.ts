import * as Sentry from '@sentry/nextjs';

import { env } from '@/env';
import { redactBreadcrumb, redactEvent } from '@/utils/sentryRedaction';

Sentry.init({
   dsn: env.SENTRY_DSN,
   enabled: Boolean(env.SENTRY_DSN),
   environment: env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV,
   release: env.VERCEL_GIT_COMMIT_SHA,
   beforeSend: redactEvent,
   beforeBreadcrumb: redactBreadcrumb,
   dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
   },
});
