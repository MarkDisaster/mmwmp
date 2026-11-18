import { describe, expect, it } from 'vitest';

import { CANONICAL_ORIGIN, getRedirects, VERCEL_PROD_HOST } from '../../../next.config';

describe('next.config redirects: Vercel production host', () => {
   const rules = getRedirects(true);

   it('has no redirect at all while the domain flag is off', () => {
      expect(getRedirects(false)).toEqual([]);
   });

   it('sends the Vercel host to the canonical domain when the flag is on', () => {
      for (const rule of rules.slice(0, 2)) {
         expect(rule.permanent).toBe(true);
         expect(rule.has).toEqual([{ type: 'host', value: VERCEL_PROD_HOST }]);
         expect(rule.destination.startsWith(`${CANONICAL_ORIGIN}/`)).toBe(true);
      }
   });

   it('redirects any path but /api and /_next', () => {
      const pattern = /^\/:path\((.*)\)$/.exec(rules[1].source)?.[1] ?? '';
      const re = { regexp: new RegExp(`^${pattern}$`) };
      expect(re.regexp.test('cs/about')).toBe(true);
      expect(re.regexp.test('sitemap.xml')).toBe(true);
      expect(re.regexp.test('api/revalidate')).toBe(false);
      expect(re.regexp.test('api')).toBe(false);
      expect(re.regexp.test('_next/static/a.js')).toBe(false);
      expect(re.regexp.test('apiary')).toBe(true);
      expect(rules[0].source).toBe('/');
   });
});
