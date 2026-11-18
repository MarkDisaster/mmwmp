import './globals.css';
import '@/utils/sentry';

import { reactErrorHandler } from '@sentry/react';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode, Suspense } from 'react';
import ReactDOM from 'react-dom/client';

import { RouteError } from '@/components/common/RouteError';
import { RouteNotFound } from '@/components/common/RouteNotFound';
import { RoutePending } from '@/components/common/RoutePending';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
   AUTH_QUERY_KEY,
   REFRESH_TOKEN_TTL_MS,
   restoreLatestStoredSession,
} from '@/features/auth/auth-query';
import { protectRoutes } from '@/features/auth/side-effects/protectRoutes';
import { refreshAccessToken } from '@/features/auth/side-effects/refreshAccessToken';
import { syncSessionAcrossTabs } from '@/features/auth/side-effects/syncSessionAcrossTabs';
import { I18n } from '@/i18n/I18n';
import { startAdminEvents } from '@/realtime/adminEvents';
import { routeTree } from '@/routes/routeTree.gen';
import { queryClient } from '@/utils/query-client';

const localStoragePersister = createSyncStoragePersister({
   storage: window.localStorage,
});

const [, persisterPromise] = persistQueryClient({
   queryClient,
   persister: localStoragePersister,
   maxAge: REFRESH_TOKEN_TTL_MS,
   dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.queryKey[0] === AUTH_QUERY_KEY[0],
      shouldDehydrateMutation: () => false,
   },
});

I18n.init();

export const router = createRouter({
   routeTree,
   defaultPreload: 'intent',
   defaultPreloadStaleTime: 0,
   defaultPendingComponent: RoutePending,
   defaultErrorComponent: RouteError,
   defaultNotFoundComponent: RouteNotFound,
});

void persisterPromise.then(() => {
   restoreLatestStoredSession();
   protectRoutes(router);
   refreshAccessToken();
   syncSessionAcrossTabs();
   startAdminEvents();
});

declare module '@tanstack/react-router' {
   interface Register {
      router: typeof router;
   }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
   throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement, {
   onUncaughtError: reactErrorHandler(),
   onCaughtError: reactErrorHandler(),
   onRecoverableError: reactErrorHandler(),
});
root.render(
   <StrictMode>
      <Suspense fallback={null}>
         <QueryClientProvider client={queryClient}>
            <TooltipProvider>
               <RouterProvider router={router} />
            </TooltipProvider>
            <Toaster position="top-right" />
         </QueryClientProvider>
      </Suspense>
   </StrictMode>,
);
