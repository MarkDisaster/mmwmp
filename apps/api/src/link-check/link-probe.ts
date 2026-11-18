import http from 'node:http';
import https from 'node:https';

import { BlockedAddressError, createGuardedLookup } from './ip-guard';
import { checkableUrl } from './url-guard';

export const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 5000;
const PROBE_TIMEOUT_MS = 12_000;
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);
const HEAD_RETRY_FROM = 400;

const PERMANENT_REDIRECTS: ReadonlySet<number> = new Set([301, 308]);

type LinkStatus = 'ok' | 'redirect' | 'temporary' | 'broken' | 'blocked' | 'error';

export type LinkProbe = {
   status: LinkStatus;
   httpStatus?: number;
   finalUrl?: string;
   redirects: number;
   reason?: string;
};

export type SendResult = { status: number; location?: string };

export type SendRequest = (
   url: URL,
   method: 'HEAD' | 'GET',
   signal: AbortSignal,
) => Promise<SendResult>;

export const createSender =
   (lookup = createGuardedLookup()): SendRequest =>
   (url, method, signal) =>
      new Promise<SendResult>((resolve, reject) => {
         const transport = url.protocol === 'https:' ? https : http;
         const request = transport.request(
            url,
            {
               method,
               agent: false,
               lookup,
               signal,
               timeout: REQUEST_TIMEOUT_MS,
               maxHeaderSize: 16 * 1024,
               headers: {
                  'User-Agent': 'MarekMediaLinkChecker/1.0 (+https://marek.media)',
                  Accept: '*/*',
                  Connection: 'close',
                  ...(method === 'GET' ? { Range: 'bytes=0-0' } : {}),
               },
            },
            (response) => {
               const location = response.headers.location;
               resolve({
                  status: response.statusCode ?? 0,
                  ...(typeof location === 'string' ? { location } : {}),
               });
               response.destroy();
            },
         );
         request.on('timeout', () => request.destroy(new Error('Request timed out')));
         request.on('error', reject);
         request.end();
      });

const errorCode = (error: unknown): string | undefined =>
   typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : undefined;

const failure = (error: unknown, redirects: number): LinkProbe => {
   const code = errorCode(error);
   if (error instanceof BlockedAddressError || code === 'ERR_BLOCKED_ADDRESS') {
      return { status: 'blocked', redirects, reason: 'The address is not a public one' };
   }
   if (code === 'ENOTFOUND') {
      return { status: 'broken', redirects, reason: 'The host name does not exist' };
   }
   if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'error', redirects, reason: 'Timed out' };
   }
   return {
      status: 'error',
      redirects,
      reason: code ? `Connection failed (${code})` : 'Connection failed',
   };
};

const BROKEN_STATUSES: ReadonlySet<number> = new Set([404, 410]);

export const probeLink = async (
   start: URL,
   send: SendRequest = createSender(),
): Promise<LinkProbe> => {
   const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);
   let current = start;
   let redirects = 0;
   let permanent = true;

   for (;;) {
      let result: SendResult;
      try {
         result = await send(current, 'HEAD', signal);
         if (result.status >= HEAD_RETRY_FROM) result = await send(current, 'GET', signal);
      } catch (error) {
         return failure(error, redirects);
      }

      if (REDIRECT_STATUSES.has(result.status) && result.location) {
         if (redirects >= MAX_REDIRECTS) {
            return { status: 'error', redirects, reason: `More than ${MAX_REDIRECTS} redirects` };
         }
         let next: URL;
         try {
            next = new URL(result.location, current);
         } catch {
            return { status: 'error', redirects, reason: 'The redirect target is not a URL' };
         }
         const allowed = checkableUrl(next.href);
         if (!allowed.ok) {
            return {
               status: 'blocked',
               redirects: redirects + 1,
               reason: `Redirect: ${allowed.reason}`,
            };
         }
         current = allowed.url;
         redirects += 1;
         permanent = permanent && PERMANENT_REDIRECTS.has(result.status);
         continue;
      }

      const finalUrl = redirects > 0 ? current.href : undefined;
      if (result.status >= 200 && result.status < 300) {
         return {
            status: redirects === 0 ? 'ok' : permanent ? 'redirect' : 'temporary',
            httpStatus: result.status,
            redirects,
            ...(finalUrl ? { finalUrl } : {}),
         };
      }
      return {
         status: BROKEN_STATUSES.has(result.status) ? 'broken' : 'error',
         httpStatus: result.status,
         redirects,
         ...(finalUrl ? { finalUrl } : {}),
         reason: `HTTP ${result.status}`,
      };
   }
};
