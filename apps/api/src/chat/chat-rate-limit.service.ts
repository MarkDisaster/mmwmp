import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { RateLimitService } from '@/rate-limit/rate-limit.service';

export const CHAT_RATE_LIMITS = [
   { window: 'minute', limit: 10, windowSeconds: 60 },
   { window: 'day', limit: 300, windowSeconds: 24 * 60 * 60 },
] as const;

export const chatTurnKey = (window: (typeof CHAT_RATE_LIMITS)[number]['window'], userId: number) =>
   `chat:turns:${window}:${userId}`;

@Injectable()
export class ChatRateLimitService {
   constructor(private readonly rateLimit: RateLimitService) {}

   async assertWithinLimit(userId: number): Promise<void> {
      const results = await Promise.all(
         CHAT_RATE_LIMITS.map(({ window, limit, windowSeconds }) =>
            this.rateLimit.hit(chatTurnKey(window, userId), limit, windowSeconds),
         ),
      );

      const denied = results.filter((result) => !result.allowed);
      if (denied.length > 0) {
         throw new HttpException(
            {
               statusCode: HttpStatus.TOO_MANY_REQUESTS,
               message: 'Too many chat requests. Please try again later.',
               retryAfterSeconds: Math.max(...denied.map((result) => result.retryAfterSeconds)),
            },
            HttpStatus.TOO_MANY_REQUESTS,
         );
      }
   }
}
