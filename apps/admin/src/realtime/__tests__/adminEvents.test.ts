import { afterEach, describe, expect, it, vi } from 'vitest';

import { AUTH_QUERY_KEY } from '@/features/auth/auth-query';
import { queryClient } from '@/utils/query-client';

import {
   type AdminEventsDeps,
   getReconnectDelay,
   runAdminEvents,
   startAdminEvents,
} from '../adminEvents';

const sse = (...blocks: string[]) => {
   const encoder = new TextEncoder();
   return new Response(
      new ReadableStream({
         start(controller) {
            for (const block of blocks) controller.enqueue(encoder.encode(`${block}\n\n`));
            controller.close();
         },
      }),
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
   );
};

const change = (data: object) => `event: change\ndata: ${JSON.stringify(data)}`;
const projectUpdated = { entity: 'projects', id: 4, action: 'updated', version: 2 };

const run = async (
   responses: Array<Response | Error>,
   overrides: Partial<AdminEventsDeps> = {},
) => {
   const controller = new AbortController();
   const onChange = vi.fn();
   const onResync = vi.fn();
   const onReconnect = vi.fn();
   const sleeps: number[] = [];
   let calls = 0;
   const fetchMock = vi.fn(async () => {
      const next = responses[calls++];
      if (calls >= responses.length) queueMicrotask(() => controller.abort());
      if (next instanceof Error) throw next;
      return next;
   });
   const deps: AdminEventsDeps = {
      fetch: fetchMock as unknown as typeof fetch,
      getToken: () => 'token',
      sleep: async (ms) => void sleeps.push(ms),
      random: () => 1,
      renewSession: vi.fn().mockResolvedValue(undefined),
      heartbeatTimeoutMs: 60_000,
      onWake: () => () => undefined,
      ...overrides,
   };

   await runAdminEvents({ onChange, onResync, onReconnect }, controller.signal, deps);
   return { onChange, onResync, onReconnect, sleeps, fetchMock, deps };
};

describe('runAdminEvents', () => {
   it('connects with the access token in the Authorization header', async () => {
      const { fetchMock } = await run([sse()]);

      expect(fetchMock).toHaveBeenCalledWith(
         expect.stringContaining('/admin/events'),
         expect.objectContaining({
            headers: { Accept: 'text/event-stream', Authorization: 'Bearer token' },
         }),
      );
   });

   it('reports a change of a record', async () => {
      const { onChange } = await run([sse(change(projectUpdated))]);

      expect(onChange).toHaveBeenCalledWith(projectUpdated);
   });

   it('reports a resync, ignores a ping and a message it does not understand', async () => {
      const { onChange, onResync } = await run([
         sse(
            'event: ping\ndata: {}',
            'event: resync\ndata: {}',
            'event: change\ndata: not json',
            change({ entity: 'unknown', id: 1, action: 'updated', version: 1 }),
            change({ entity: 'projects', id: 'x', action: 'updated', version: 1 }),
         ),
      ]);

      expect(onResync).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
   });

   it('does not read everything again at the first connection, but at every one after it', async () => {
      const { onReconnect } = await run([sse(), sse(), sse()]);

      expect(onReconnect).toHaveBeenCalledTimes(2);
   });

   it('connects again after the server ended the stream, with a short pause', async () => {
      const { fetchMock, sleeps } = await run([sse(), sse()]);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(sleeps[0]).toBe(getReconnectDelay(0, 1));
   });

   it('backs off exponentially while the connection fails and starts over after it works', async () => {
      const down = new Error('offline');
      const { sleeps } = await run([down, down, down, sse(), down, down, down]);

      expect(sleeps).toEqual([
         getReconnectDelay(0, 1),
         getReconnectDelay(1, 1),
         getReconnectDelay(2, 1),
         getReconnectDelay(0, 1),
         getReconnectDelay(0, 1),
         getReconnectDelay(1, 1),
      ]);
   });

   it('asks for a new token after a 401 and tries again', async () => {
      const renewSession = vi.fn().mockResolvedValue(undefined);
      const { fetchMock } = await run([new Response(null, { status: 401 }), sse()], {
         renewSession,
      });

      expect(renewSession).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
   });

   it('does not renew the session for another failure', async () => {
      const renewSession = vi.fn();
      await run([new Response(null, { status: 429 }), sse()], { renewSession });

      expect(renewSession).not.toHaveBeenCalled();
   });

   it('stops when there is no token (signed out)', async () => {
      const { fetchMock } = await run([sse()], { getToken: () => undefined });

      expect(fetchMock).not.toHaveBeenCalled();
   });

   it('stops at once when it is aborted, without another connection', async () => {
      const { fetchMock } = await run([new Error('aborted'), sse()].slice(0, 1));

      expect(fetchMock).toHaveBeenCalledTimes(1);
   });
});

describe('getReconnectDelay', () => {
   it('doubles up to 30 seconds', () => {
      expect([0, 1, 2, 3, 4, 5, 6, 10].map((n) => getReconnectDelay(n, 1))).toEqual([
         1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000,
      ]);
   });

   it('spreads the clients: the delay is between half and all of it', () => {
      expect(getReconnectDelay(2, 0)).toBe(2_000);
      expect(getReconnectDelay(2, 1)).toBe(4_000);
   });
});

const silentStream = (signal?: AbortSignal | null, pings?: { every: number }) =>
   new Response(
      new ReadableStream({
         start(controller) {
            let timer: ReturnType<typeof setInterval> | undefined;
            if (pings) {
               timer = setInterval(
                  () => controller.enqueue(new TextEncoder().encode('event: ping\ndata: {}\n\n')),
                  pings.every,
               );
            }
            signal?.addEventListener('abort', () => {
               clearInterval(timer);
               controller.error(new DOMException('aborted', 'AbortError'));
            });
         },
      }),
      { status: 200 },
   );

describe('the heartbeat of the connection', () => {
   afterEach(() => vi.useRealTimers());

   const runSilent = (pings?: { every: number }) => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const onReconnect = vi.fn();
      const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) =>
         silentStream(init?.signal, pings),
      );
      void runAdminEvents(
         { onChange: vi.fn(), onResync: vi.fn(), onReconnect },
         controller.signal,
         {
            fetch: fetchMock as unknown as typeof fetch,
            getToken: () => 'token',
            sleep: async () => undefined,
            random: () => 1,
            renewSession: vi.fn(),
            heartbeatTimeoutMs: 60_000,
            onWake: () => () => undefined,
         },
      );
      return { controller, onReconnect, fetchMock };
   };

   it('closes a connection that delivers nothing for a minute and connects again', async () => {
      const { controller, onReconnect, fetchMock } = runSilent();

      await vi.advanceTimersByTimeAsync(59_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(2_000);
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(onReconnect).toHaveBeenCalled();
      controller.abort();
   });

   it('keeps a connection alive as long as the pings come', async () => {
      const { controller, fetchMock } = runSilent({ every: 25_000 });

      await vi.advanceTimersByTimeAsync(5 * 60_000);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      controller.abort();
   });
});

describe('the abort listeners of the loop', () => {
   it('are removed again, not piled up on one signal', async () => {
      const controller = new AbortController();
      const add = vi.spyOn(controller.signal, 'addEventListener');
      const remove = vi.spyOn(controller.signal, 'removeEventListener');
      let calls = 0;
      const deps: AdminEventsDeps = {
         fetch: vi.fn(async () => {
            if (++calls === 6) queueMicrotask(() => controller.abort());
            return sse();
         }) as unknown as typeof fetch,
         getToken: () => 'token',
         sleep: async () => undefined,
         random: () => 1,
         renewSession: vi.fn(),
         heartbeatTimeoutMs: 60_000,
         onWake: () => () => undefined,
      };

      await runAdminEvents(
         { onChange: vi.fn(), onResync: vi.fn(), onReconnect: vi.fn() },
         controller.signal,
         deps,
      );

      expect(add.mock.calls.length).toBeGreaterThan(5);
      expect(remove.mock.calls.length).toBe(add.mock.calls.length);
   });
});

describe('a 401 and a newer token', () => {
   it('does not renew the session when the token changed meanwhile', async () => {
      const controller = new AbortController();
      let token = 'old';
      let calls = 0;
      const renewSession = vi.fn().mockResolvedValue(undefined);
      const fetchMock = vi.fn(async () => {
         if (++calls === 1) {
            token = 'new';
            return new Response(null, { status: 401 });
         }
         queueMicrotask(() => controller.abort());
         return sse();
      });

      await runAdminEvents(
         { onChange: vi.fn(), onResync: vi.fn(), onReconnect: vi.fn() },
         controller.signal,
         {
            fetch: fetchMock as unknown as typeof fetch,
            getToken: () => token,
            sleep: async () => undefined,
            random: () => 1,
            renewSession,
            heartbeatTimeoutMs: 60_000,
            onWake: () => () => undefined,
         },
      );

      expect(renewSession).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(2);
   });
});

const jwt = (sub: number) => `h.${btoa(JSON.stringify({ sub }))}.s`;
const session = (sub: number) => ({ accessToken: jwt(sub), refreshToken: 'r', expiresAt: 'x' });

describe('startAdminEvents', () => {
   const stops: Array<() => void> = [];

   afterEach(() => {
      stops.splice(0).forEach((stop) => stop());
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      vi.restoreAllMocks();
   });

   const start = () => {
      const signals: AbortSignal[] = [];
      const tokens: string[] = [];
      let wake = () => undefined as void;
      const unsubscribeWake = vi.fn();
      const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
         signals.push(init?.signal as AbortSignal);
         tokens.push((init?.headers as Record<string, string>).Authorization);
         return silentStream(init?.signal);
      });
      const stop = startAdminEvents({
         fetch: fetchMock as unknown as typeof fetch,
         getToken: () =>
            (queryClient.getQueryData(AUTH_QUERY_KEY) as { accessToken?: string } | null)
               ?.accessToken,
         sleep: (_ms, signal) =>
            new Promise((resolve) => signal.addEventListener('abort', () => resolve())),
         random: () => 1,
         renewSession: vi.fn(),
         heartbeatTimeoutMs: 60_000,
         onWake: (callback) => {
            wake = callback;
            return unsubscribeWake;
         },
      });
      stops.push(stop);
      const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
      return { signals, tokens, fetchMock, stop, tick, wake: () => wake(), unsubscribeWake };
   };

   it('stays closed while nobody is signed in, opens after the sign-in', async () => {
      const { fetchMock, tick } = start();
      await tick();
      expect(fetchMock).not.toHaveBeenCalled();

      queryClient.setQueryData(AUTH_QUERY_KEY, session(1));
      await tick();

      expect(fetchMock).toHaveBeenCalledTimes(1);
   });

   it('closes the stream at sign-out', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session(1));
      const { signals, tick } = start();
      await tick();
      expect(signals[0].aborted).toBe(false);

      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      await tick();

      expect(signals[0].aborted).toBe(true);
   });

   it('does not open a second loop when the session of the same user is renewed', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session(1));
      const { fetchMock, signals, tick } = start();
      await tick();

      queryClient.setQueryData(AUTH_QUERY_KEY, { ...session(1), refreshToken: 'r2' });
      queryClient.setQueryData(AUTH_QUERY_KEY, { ...session(1), expiresAt: 'later' });
      await tick();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(signals[0].aborted).toBe(false);
   });

   it('replaces the stream when another user signs in without a sign-out between', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session(1));
      const { fetchMock, signals, tokens, tick } = start();
      await tick();

      queryClient.setQueryData(AUTH_QUERY_KEY, session(2));
      await tick();

      expect(signals[0].aborted).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(tokens[1]).toBe(`Bearer ${jwt(2)}`);
   });

   it('reconnects when the browser may have lost the connection, and reads the lists again', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session(1));
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
      const { fetchMock, signals, tick, wake } = start();
      await tick();
      expect(invalidate).not.toHaveBeenCalled();

      wake();
      await tick();

      expect(signals[0].aborted).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(invalidate).toHaveBeenCalled();
   });

   it('stops everything with the function it returns', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session(1));
      const { signals, tick, stop, unsubscribeWake } = start();
      await tick();

      stop();

      expect(signals[0].aborted).toBe(true);
      expect(unsubscribeWake).toHaveBeenCalled();
   });
});
