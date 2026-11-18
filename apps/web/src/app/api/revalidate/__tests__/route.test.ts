import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { revalidateTag } from 'next/cache';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../route';

const SECRET = vi.hoisted(() => 'revalidate-secret-of-at-least-32-characters');

vi.mock('@/env', () => ({ env: { REVALIDATE_SECRET: SECRET } }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

const apiTags = (() => {
   const source = readFileSync(
      fileURLToPath(
         new URL('../../../../../../api/src/revalidation/revalidation.service.ts', import.meta.url),
      ),
      'utf8',
   );
   const list = /REVALIDATION_TAGS = \[([^\]]+)\] as const/.exec(source)?.[1];
   if (!list) throw new Error('REVALIDATION_TAGS not found in the API source');
   return [...list.matchAll(/'([^']+)'/g)].map(([, tag]) => tag);
})();

const post = (body: unknown) =>
   POST(
      new Request('https://web.test/api/revalidate', {
         method: 'POST',
         body: JSON.stringify(body),
      }),
   );

describe('POST /api/revalidate', () => {
   afterEach(() => {
      vi.resetAllMocks();
   });

   it.each(apiTags)('revalidates the %s tag the API sends', async (tag) => {
      const response = await post({ tag, secret: SECRET });

      expect(response.status).toBe(200);
      expect(revalidateTag).toHaveBeenCalledWith(tag);
   });

   it('rejects a tag no data read uses', async () => {
      const response = await post({ tag: 'project', secret: SECRET });

      expect(response.status).toBe(400);
      expect(revalidateTag).not.toHaveBeenCalled();
   });

   it('rejects a wrong secret before looking at the tag', async () => {
      const response = await post({ tag: 'projects', secret: 'wrong' });

      expect(response.status).toBe(401);
      expect(revalidateTag).not.toHaveBeenCalled();
   });
});
