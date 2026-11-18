import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';

import { redactUrl } from '@/utils/redactUrl';

export const redactEvent = (event: ErrorEvent): ErrorEvent => {
   if (event.request?.url) event.request.url = redactUrl(event.request.url);
   if (event.transaction) event.transaction = redactUrl(event.transaction);
   return event;
};

export const redactBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb => {
   const url = breadcrumb.data?.url;
   if (breadcrumb.data && typeof url === 'string') breadcrumb.data.url = redactUrl(url);
   return breadcrumb;
};
