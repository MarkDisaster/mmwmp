import { revalidateTag } from 'next/cache';

import { env } from '@/env';
import { CACHE_TAGS } from '@/utils/cacheConfig';
import { isSecretValid } from '@/utils/secret';

export async function POST(request: Request): Promise<Response> {
   let body: unknown;

   try {
      body = await request.json();
   } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
   }

   if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid body' }, { status: 400 });
   }

   const { tag, secret } = body as Record<string, unknown>;

   if (!env.REVALIDATE_SECRET) {
      console.error('[revalidate] REVALIDATE_SECRET is not configured on this server');
      return Response.json({ error: 'Server misconfiguration' }, { status: 500 });
   }

   if (typeof secret !== 'string' || !isSecretValid(secret, env.REVALIDATE_SECRET)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
   }

   if (typeof tag !== 'string' || !(CACHE_TAGS as readonly string[]).includes(tag)) {
      return Response.json(
         { error: `Unknown tag. Allowed: ${CACHE_TAGS.join(', ')}` },
         { status: 400 },
      );
   }

   revalidateTag(tag);

   return Response.json({ revalidated: true, tag });
}
