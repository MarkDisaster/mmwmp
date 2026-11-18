import { HttpException, HttpStatus } from '@nestjs/common';

import type { RateLimitService } from '@/rate-limit/rate-limit.service';

import { CHAT_RATE_LIMITS, ChatRateLimitService } from '../chat-rate-limit.service';

describe('ChatRateLimitService', () => {
   const allowed = { allowed: true, count: 1, retryAfterSeconds: 60 };
   let hit: jest.Mock;
   let service: ChatRateLimitService;

   beforeEach(() => {
      hit = jest.fn().mockResolvedValue(allowed);
      service = new ChatRateLimitService({ hit } as unknown as RateLimitService);
   });

   it('counts the turn in every window of the user', async () => {
      await service.assertWithinLimit(7);

      expect(hit).toHaveBeenCalledTimes(CHAT_RATE_LIMITS.length);
      for (const { window, limit, windowSeconds } of CHAT_RATE_LIMITS) {
         expect(hit).toHaveBeenCalledWith(`chat:turns:${window}:7`, limit, windowSeconds);
      }
   });

   it('keeps the users apart', async () => {
      await service.assertWithinLimit(7);
      await service.assertWithinLimit(8);

      const keys = hit.mock.calls.map(([key]) => key as string);
      expect(keys.filter((key) => key.endsWith(':7'))).toHaveLength(CHAT_RATE_LIMITS.length);
      expect(keys.filter((key) => key.endsWith(':8'))).toHaveLength(CHAT_RATE_LIMITS.length);
   });

   it('answers 429 with the longest wait when a window is used up', async () => {
      hit.mockResolvedValueOnce({ allowed: false, count: 11, retryAfterSeconds: 42 });

      const error = await service.assertWithinLimit(7).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect((error as HttpException).getResponse()).toEqual(
         expect.objectContaining({ retryAfterSeconds: 42 }),
      );
   });

   it('lets the turn through within the limits', async () => {
      await expect(service.assertWithinLimit(7)).resolves.toBeUndefined();
   });
});
