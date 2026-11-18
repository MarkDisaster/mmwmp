import { QueryObserver } from '@tanstack/react-query';

import type { AuthResponseEntity } from '@/api/generated';
import { AUTH_QUERY_KEY } from '@/features/auth/auth-query';
import { refreshSession } from '@/utils/axios';
import { queryClient } from '@/utils/query-client';

const REFRESH_BEFORE_MS = 5 * 60 * 1000;

export const refreshAccessToken = () => {
   let timeoutId: ReturnType<typeof setTimeout> | null = null;
   let prevExpiresAt: string | null = null;

   const doRefresh = () => {
      refreshSession().catch(() => undefined);
   };

   const handleSession = (session: AuthResponseEntity | null | undefined) => {
      const expiresAt = session?.expiresAt;

      if (expiresAt && expiresAt !== prevExpiresAt) {
         if (timeoutId !== null) clearTimeout(timeoutId);

         const expiresAtMs = new Date(expiresAt).getTime();
         const refreshAt = expiresAtMs - REFRESH_BEFORE_MS;
         const delay = refreshAt - Date.now();

         if (delay <= 0) {
            doRefresh();
         } else {
            timeoutId = setTimeout(doRefresh, delay);
         }
      }

      if (!session && timeoutId !== null) {
         clearTimeout(timeoutId);
         timeoutId = null;
      }

      prevExpiresAt = expiresAt ?? null;
   };

   const observer = new QueryObserver<AuthResponseEntity | null>(queryClient, {
      queryKey: AUTH_QUERY_KEY,
      notifyOnChangeProps: ['data'],
   });
   const unsubscribe = observer.subscribe((state) => handleSession(state.data));
   handleSession(observer.getCurrentResult().data);

   return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      unsubscribe();
   };
};
