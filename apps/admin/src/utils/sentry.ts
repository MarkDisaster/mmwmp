import * as Sentry from '@sentry/react';

import { isExpectedError } from '@/utils/isExpectedError';
import { redactUrl } from '@/utils/redactUrl';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export const beforeSend: NonNullable<Sentry.BrowserOptions['beforeSend']> = (event, hint) => {
   if (isExpectedError(hint.originalException)) return null;
   if (event.request?.url) event.request.url = redactUrl(event.request.url);
   if (event.transaction) event.transaction = redactUrl(event.transaction);
   return event;
};

export const beforeBreadcrumb: NonNullable<Sentry.BrowserOptions['beforeBreadcrumb']> = (
   breadcrumb,
) => {
   const { data } = breadcrumb;
   for (const key of ['url', 'from', 'to']) {
      const value = data?.[key];
      if (data && typeof value === 'string') data[key] = redactUrl(value);
   }
   return breadcrumb;
};

Sentry.init({
   dsn: dsn || undefined,
   enabled: Boolean(dsn),
   environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) || undefined,
   release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) || undefined,
   beforeSend,
   beforeBreadcrumb,
   dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
   },
});
