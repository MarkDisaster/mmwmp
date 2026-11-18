import type { Breadcrumb, ErrorEvent, EventHint } from '@sentry/react';
import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { beforeBreadcrumb, beforeSend } from '../sentry';

vi.mock('@sentry/react', () => ({ init: vi.fn() }));

const axiosError = (status: number) =>
   new AxiosError('failed', undefined, undefined, undefined, {
      status,
      data: {},
      headers: {},
      statusText: '',
      config: {},
   } as never);

const send = (originalException: unknown, event: ErrorEvent = { type: undefined }) =>
   beforeSend(event, { originalException } as EventHint);

describe('beforeSend', () => {
   it.each([403, 404])('should drop a %s from the API', (status) => {
      expect(send(axiosError(status))).toBeNull();
   });

   it('should send a 5xx and an error that is not from the API', () => {
      expect(send(axiosError(500))).not.toBeNull();
      expect(send(new Error('render failed'))).not.toBeNull();
   });

   it('should remove the token and the query from the address and the transaction', () => {
      const event = send(new Error('failed'), {
         type: undefined,
         request: { url: 'https://admin.marek.media/invitation/abc123?email=jana' },
         transaction: '/reset-password/xyz',
      }) as ErrorEvent;
      expect(event.request?.url).toBe('https://admin.marek.media/invitation/[token]');
      expect(event.transaction).toBe('/reset-password/[token]');
   });
});

describe('beforeBreadcrumb', () => {
   it('should remove the token and the query from the addresses of a breadcrumb', () => {
      const breadcrumb = beforeBreadcrumb({
         category: 'navigation',
         data: { from: '/invitation/abc123', to: '/projects?search=jana', url: 7 },
      }) as Breadcrumb;
      expect(breadcrumb.data).toEqual({ from: '/invitation/[token]', to: '/projects', url: 7 });
   });
});
