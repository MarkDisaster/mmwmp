import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';

import { DRAFT_TYPES } from '@/features/draft-preview/utils/draftPath';

const payloadSchema = z.object({
   resource: z.enum(DRAFT_TYPES),
   id: z.number().int().positive(),
   slug: z.string().min(1),
   locale: z.string(),
   exp: z.number().int(),
});

export type PreviewTokenPayload = z.infer<typeof payloadSchema>;

const decodePayload = (body: string): unknown => {
   try {
      return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
   } catch {
      return null;
   }
};

export const verifyPreviewToken = (
   token: string,
   key: string,
   now = Date.now(),
): PreviewTokenPayload | null => {
   const [body, signature, ...rest] = token.split('.');
   if (!body || !signature || rest.length > 0 || key.length === 0) return null;

   const expected = Buffer.from(createHmac('sha256', key).update(body).digest('base64url'));
   const received = Buffer.from(signature);
   if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

   const payload = payloadSchema.safeParse(decodePayload(body));
   if (!payload.success || payload.data.exp <= Math.floor(now / 1000)) return null;

   return payload.data;
};
