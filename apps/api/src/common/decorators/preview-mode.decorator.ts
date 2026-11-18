import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

import { extractBearerToken } from '@/auth/access-token';

const digest = (value: string) => createHash('sha256').update(value).digest();

export const isPreviewTokenAccepted = (
   token: string,
   accepted: ReadonlyArray<string | undefined>,
): boolean => {
   const received = digest(token);
   return accepted.some((expected) => !!expected && timingSafeEqual(received, digest(expected)));
};

export const PreviewMode = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
   const token = extractBearerToken(ctx.switchToHttp().getRequest<Request>());
   if (!token) return false;

   return isPreviewTokenAccepted(token, [
      process.env.PREVIEW_API_TOKEN,
      process.env.PREVIEW_SECRET,
   ]);
});
