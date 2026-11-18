import { createHash } from 'node:crypto';

const SENSITIVE_KEYS = new Set([
   'password',
   'currentPassword',
   'newPassword',
   'token',
   'refreshToken',
   'accessToken',
   'secret',
]);

const EMPTY: ReadonlySet<string> = new Set();

export const redact = (
   value: unknown,
   additionalSensitiveKeys: ReadonlySet<string> = EMPTY,
): unknown => {
   if (value === null || value === undefined) return value;
   if (Array.isArray(value)) return value.map((item) => redact(item, additionalSensitiveKeys));
   if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
         out[k] =
            SENSITIVE_KEYS.has(k) || additionalSensitiveKeys.has(k)
               ? '[redacted]'
               : redact(v, additionalSensitiveKeys);
      }
      return out;
   }
   return value;
};

export const RICH_TEXT_KEYS: readonly string[] = ['description', 'content'];

export const summarizeKeys = (value: unknown, keys: ReadonlySet<string>): unknown => {
   if (keys.size === 0 || value === null || value === undefined) return value;
   if (Array.isArray(value)) return value.map((item) => summarizeKeys(item, keys));
   if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
         out[k] =
            keys.has(k) && typeof v === 'string'
               ? { length: v.length, sha256: createHash('sha256').update(v).digest('hex') }
               : summarizeKeys(v, keys);
      }
      return out;
   }
   return value;
};
