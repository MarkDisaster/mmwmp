import net from 'node:net';

import { isPublicAddress } from './ip-guard';

export type CheckableUrl = { ok: true; url: URL } | { ok: false; reason: string };

const ALLOWED_PORTS: ReadonlySet<string> = new Set(['', '80', '443']);

const INTERNAL_HOST = /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|corp)\.?$/i;

export const MAX_URL_LENGTH = 2048;

export const checkableUrl = (raw: string): CheckableUrl => {
   if (raw.length > MAX_URL_LENGTH) return { ok: false, reason: 'URL is too long' };

   let url: URL;
   try {
      url = new URL(raw.trim());
   } catch {
      return { ok: false, reason: 'Not a valid absolute URL' };
   }

   if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, reason: `Scheme ${url.protocol.replace(':', '')} is not checked` };
   }
   if (url.username !== '' || url.password !== '') {
      return { ok: false, reason: 'URL with credentials is not checked' };
   }
   if (!ALLOWED_PORTS.has(url.port)) {
      return { ok: false, reason: `Port ${url.port} is not checked` };
   }

   const host = url.hostname.replace(/^\[|\]$/g, '');
   if (host === '') return { ok: false, reason: 'URL has no host' };

   if (net.isIP(host) !== 0) {
      if (!isPublicAddress(host)) return { ok: false, reason: 'Address is not a public one' };
   } else if (INTERNAL_HOST.test(host) || !host.includes('.')) {
      return { ok: false, reason: 'Host is not a public name' };
   }
   return { ok: true, url };
};
