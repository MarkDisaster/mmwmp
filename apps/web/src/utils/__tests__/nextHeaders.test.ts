import { describe, expect, it } from 'vitest';

import { getHeaders, INDEXABLE_HOST } from '../../../next.config';

describe('next.config headers', () => {
   const rules = getHeaders();

   it('sends noindex for every host except marek.media and www.marek.media', () => {
      const rule = rules.find((r) => 'missing' in r);
      expect(rule?.source).toBe('/:path*');
      expect(rule?.missing).toEqual([{ type: 'host', value: INDEXABLE_HOST }]);
      expect(rule?.headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]);
      const re = new RegExp(`^${INDEXABLE_HOST}$`);
      expect(re.test('marek.media')).toBe(true);
      expect(re.test('www.marek.media')).toBe(true);
      expect(re.test('mm-web-prod.vercel.app')).toBe(false);
      expect(re.test('evilmarek.media')).toBe(false);
   });

   it('sets the safe security headers on all routes', () => {
      const keys = rules.flatMap((r) => r.headers.map((h) => h.key));
      expect(keys).toEqual(
         expect.arrayContaining([
            'X-Content-Type-Options',
            'Referrer-Policy',
            'Permissions-Policy',
         ]),
      );
   });
});
