import type { ErrorEvent } from '@sentry/nextjs';
import { describe, expect, it } from 'vitest';

import { redactBreadcrumb, redactEvent } from '../sentryRedaction';

describe('redactEvent', () => {
   it('should drop the query of the request address and of the transaction', () => {
      const event: ErrorEvent = {
         type: undefined,
         request: { url: 'https://marek.media/api/draft?secret=abc&slug=x' },
         transaction: 'GET /api/draft?secret=abc',
      };

      expect(redactEvent(event)).toMatchObject({
         request: { url: 'https://marek.media/api/draft' },
         transaction: 'GET /api/draft',
      });
   });

   it('should keep an event without an address or a transaction as it is', () => {
      const event: ErrorEvent = { type: undefined, message: 'boom' };

      expect(redactEvent(event)).toEqual({ type: undefined, message: 'boom' });
   });
});

describe('redactBreadcrumb', () => {
   it('should drop the query of the address of an HTTP breadcrumb', () => {
      const breadcrumb = {
         category: 'http',
         data: { method: 'GET', url: 'https://api.marek.media/public/projects?search=x&page=2' },
      };

      expect(redactBreadcrumb(breadcrumb).data).toEqual({
         method: 'GET',
         url: 'https://api.marek.media/public/projects',
      });
   });

   it('should keep a breadcrumb without an address as it is', () => {
      const breadcrumb = { category: 'console', message: 'hello', data: { arguments: ['hello'] } };

      expect(redactBreadcrumb(breadcrumb)).toEqual({
         category: 'console',
         message: 'hello',
         data: { arguments: ['hello'] },
      });
   });
});
