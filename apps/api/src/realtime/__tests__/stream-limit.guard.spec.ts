import { EventEmitter } from 'node:events';

import type { ExecutionContext } from '@nestjs/common';

import { MAX_STREAMS_PER_USER } from '../admin-events.constants';
import type { AdminEventsService } from '../admin-events.service';
import { StreamLimitGuard } from '../stream-limit.guard';

const buildGuard = (isClosing = false) => new StreamLimitGuard({ isClosing } as AdminEventsService);

const connect = (guard: StreamLimitGuard, userId: number) => {
   const response = new EventEmitter();
   const context = {
      switchToHttp: () => ({
         getRequest: () => ({ user: { id: userId } }),
         getResponse: () => response,
      }),
   } as unknown as ExecutionContext;
   return { open: () => guard.canActivate(context), close: () => response.emit('close') };
};

describe('StreamLimitGuard', () => {
   it('refuses a stream with a 503 while the server shuts down', () => {
      expect(() => connect(buildGuard(true), 1).open()).toThrow(
         expect.objectContaining({ status: 503 }) as Error,
      );
   });

   it(`refuses the stream after ${MAX_STREAMS_PER_USER} with a 429`, () => {
      const guard = buildGuard();
      for (let i = 0; i < MAX_STREAMS_PER_USER; i++) connect(guard, 1).open();

      expect(() => connect(guard, 1).open()).toThrow(
         expect.objectContaining({ status: 429 }) as Error,
      );
   });

   it('counts each user on their own', () => {
      const guard = buildGuard();
      for (let i = 0; i < MAX_STREAMS_PER_USER; i++) connect(guard, 1).open();

      expect(connect(guard, 2).open()).toBe(true);
   });

   it('frees the slot when the connection closes, once', () => {
      const guard = buildGuard();
      const streams = Array.from({ length: MAX_STREAMS_PER_USER }, () => connect(guard, 1));
      streams.forEach(({ open }) => open());

      streams[0].close();
      streams[0].close();

      expect(connect(guard, 1).open()).toBe(true);
      expect(() => connect(guard, 1).open()).toThrow();
   });
});
