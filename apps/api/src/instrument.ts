import * as Sentry from '@sentry/nestjs';

import { redactUrl } from './common/sentry/redact-url';

Sentry.init({
   dsn: process.env.SENTRY_DSN || undefined,
   enabled: Boolean(process.env.SENTRY_DSN),
   environment: process.env.SENTRY_ENVIRONMENT || process.env.APP_ENV || process.env.NODE_ENV,
   release: process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
   beforeSend: (event) => {
      if (event.request?.url) event.request.url = redactUrl(event.request.url);
      if (event.transaction) event.transaction = redactUrl(event.transaction);
      return event;
   },
   beforeBreadcrumb: (breadcrumb) => {
      const url = breadcrumb.data?.url;
      if (breadcrumb.data && typeof url === 'string') breadcrumb.data.url = redactUrl(url);
      return breadcrumb;
   },
   dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
   },
});
