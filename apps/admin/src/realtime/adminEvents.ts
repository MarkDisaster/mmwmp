import { type QueryKey, QueryObserver } from '@tanstack/react-query';
import { createParser } from 'eventsource-parser';

import type { AdminEventEntity, AuthResponseEntity } from '@/api/generated';
import { editLockEntityEnum } from '@/api/generated';
import { AUTH_QUERY_KEY, endAuthSession, getAuthSession } from '@/features/auth/auth-query';
import { getTokenSubject } from '@/features/auth/utils/tokenSubject';
import { API_URL, refreshSession } from '@/utils/axios';
import { getHttpStatus } from '@/utils/httpError';
import { queryClient } from '@/utils/query-client';

import { getAllEventInvalidationKeys, getEventInvalidationKeys } from './eventInvalidation';

const ADMIN_EVENTS_URL = `${API_URL}/admin/events`;

const INITIAL_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

const HEARTBEAT_TIMEOUT_MS = 60_000;

const WAKE_AFTER_HIDDEN_MS = 30_000;

class StreamStatusError extends Error {
   constructor(readonly status: number) {
      super(`The event stream answered ${status}`);
   }
}

type StreamHandlers = {
   onChange: (event: AdminEventEntity) => void;
   onResync: () => void;
};

export type AdminEventsDeps = {
   fetch: typeof fetch;
   getToken: () => string | undefined;
   sleep: (ms: number, signal: AbortSignal) => Promise<void>;
   random: () => number;
   renewSession: () => Promise<unknown>;
   heartbeatTimeoutMs: number;
   onWake: (wake: () => void) => () => void;
};

const isAdminEvent = (value: unknown): value is AdminEventEntity => {
   const event = value as Partial<AdminEventEntity> | null;
   return (
      typeof event?.id === 'number' &&
      typeof event.action === 'string' &&
      Object.values(editLockEntityEnum).includes(event.entity as never)
   );
};

export const getReconnectDelay = (failures: number, random: number) =>
   Math.min(MAX_DELAY_MS, INITIAL_DELAY_MS * 2 ** failures) * (0.5 + random / 2);

const readStream = async (
   response: Response,
   handlers: StreamHandlers,
   signal: AbortSignal,
   onActivity: () => void,
): Promise<void> => {
   if (!response.body) throw new Error('The event stream has no body');
   const parser = createParser({
      onEvent: ({ event, data }) => {
         if (event === 'resync') {
            handlers.onResync();
         } else if (event === 'change') {
            try {
               const parsed: unknown = JSON.parse(data);
               if (isAdminEvent(parsed)) handlers.onChange(parsed);
            } catch {
               // A message this client does not understand is not worth closing the stream for.
            }
         }
      },
   });
   const decoder = new TextDecoder();
   const reader = response.body.getReader();
   const cancel = () => void reader.cancel().catch(() => undefined);
   signal.addEventListener('abort', cancel, { once: true });
   try {
      for (;;) {
         const { done, value } = await reader.read();
         if (done) return;
         onActivity();
         parser.feed(decoder.decode(value, { stream: true }));
      }
   } finally {
      signal.removeEventListener('abort', cancel);
   }
};

const connect = async (
   token: string,
   handlers: StreamHandlers,
   loopSignal: AbortSignal,
   deps: AdminEventsDeps,
   onOpen: () => void,
): Promise<void> => {
   const connection = new AbortController();
   const stop = () => connection.abort();
   loopSignal.addEventListener('abort', stop, { once: true });
   let heartbeat: ReturnType<typeof setTimeout> | undefined;
   const watchHeartbeat = () => {
      clearTimeout(heartbeat);
      heartbeat = setTimeout(stop, deps.heartbeatTimeoutMs);
   };

   try {
      watchHeartbeat();
      const response = await deps.fetch(ADMIN_EVENTS_URL, {
         headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
         signal: connection.signal,
      });
      if (!response.ok) throw new StreamStatusError(response.status);
      onOpen();
      await readStream(response, handlers, connection.signal, watchHeartbeat);
   } finally {
      clearTimeout(heartbeat);
      loopSignal.removeEventListener('abort', stop);
   }
};

export const runAdminEvents = async (
   handlers: StreamHandlers & { onReconnect: () => void },
   signal: AbortSignal,
   deps: AdminEventsDeps,
   { resumed = false }: { resumed?: boolean } = {},
): Promise<void> => {
   let failures = 0;
   let hasConnected = resumed;
   const onOpen = () => {
      if (hasConnected) handlers.onReconnect();
      hasConnected = true;
      failures = 0;
   };

   while (!signal.aborted) {
      const token = deps.getToken();
      if (!token) return;

      try {
         await connect(token, handlers, signal, deps, onOpen);
         await deps.sleep(getReconnectDelay(0, deps.random()), signal);
      } catch (error) {
         if (signal.aborted) return;
         if (
            error instanceof StreamStatusError &&
            error.status === 401 &&
            deps.getToken() === token
         ) {
            await deps.renewSession().catch(() => undefined);
         }
         failures += 1;
         await deps.sleep(getReconnectDelay(failures - 1, deps.random()), signal);
      }
   }
};

const defaultDeps: AdminEventsDeps = {
   fetch: (input, init) => fetch(input, init),
   getToken: () => getAuthSession()?.accessToken,
   sleep: (ms, signal) =>
      new Promise((resolve) => {
         const done = () => {
            clearTimeout(timer);
            signal.removeEventListener('abort', done);
            resolve();
         };
         const timer = setTimeout(done, ms);
         signal.addEventListener('abort', done, { once: true });
      }),
   random: Math.random,
   renewSession: async () => {
      try {
         await refreshSession();
      } catch (error) {
         if (getHttpStatus(error) === 401) endAuthSession();
      }
   },
   heartbeatTimeoutMs: HEARTBEAT_TIMEOUT_MS,
   onWake: (wake) => {
      let hiddenAt: number | null = null;
      const onVisibility = () => {
         if (document.visibilityState === 'hidden') {
            hiddenAt = Date.now();
            return;
         }
         if (hiddenAt !== null && Date.now() - hiddenAt >= WAKE_AFTER_HIDDEN_MS) wake();
         hiddenAt = null;
      };
      window.addEventListener('online', wake);
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
         window.removeEventListener('online', wake);
         document.removeEventListener('visibilitychange', onVisibility);
      };
   },
};

const invalidate = (keys: readonly QueryKey[]) =>
   keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));

export const startAdminEvents = (deps: AdminEventsDeps = defaultDeps): (() => void) => {
   let running: { controller: AbortController; userId: string } | null = null;

   const handlers = {
      onChange: (event: AdminEventEntity) => invalidate(getEventInvalidationKeys(event)),
      onResync: () => invalidate(getAllEventInvalidationKeys()),
      onReconnect: () => invalidate(getAllEventInvalidationKeys()),
   };

   const start = (userId: string, resumed: boolean) => {
      const controller = new AbortController();
      running = { controller, userId };
      void runAdminEvents(handlers, controller.signal, deps, { resumed });
   };

   const stop = () => {
      running?.controller.abort();
      running = null;
   };

   const sync = () => {
      const token = deps.getToken();
      const userId = token ? (getTokenSubject(token) ?? token) : null;
      if (running && running.userId !== userId) stop();
      if (userId !== null && !running) start(userId, false);
   };

   const observer = new QueryObserver<AuthResponseEntity | null>(queryClient, {
      queryKey: AUTH_QUERY_KEY,
      notifyOnChangeProps: ['data'],
   });
   const unsubscribe = observer.subscribe(() => sync());
   sync();

   const stopWaking = deps.onWake(() => {
      if (!running) return;
      const { userId } = running;
      stop();
      start(userId, true);
   });

   return () => {
      stopWaking();
      unsubscribe();
      stop();
   };
};
