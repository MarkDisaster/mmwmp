export const MAX_URL_LENGTH = 2048;

const SCHEME = /^https?:\/\/(?!\/)/i;
const FORBIDDEN = /[\s\\\p{Cc}\p{Cf}]/u;
const LABEL = /^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

export function isHttpUrl(value: unknown): value is string {
   if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return false;
   if (!SCHEME.test(value) || FORBIDDEN.test(value)) return false;

   let url: URL;
   try {
      url = new URL(value);
   } catch {
      return false;
   }
   if (url.username || url.password) return false;

   const labels = url.hostname.split('.');
   const tld = labels[labels.length - 1] ?? '';
   return labels.length >= 2 && TLD.test(tld) && labels.every((label) => LABEL.test(label));
}
