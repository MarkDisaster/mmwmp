import { QueryObserver } from '@tanstack/react-query';
import type { AnyRouter, ParsedLocation } from '@tanstack/react-router';

import type { AuthResponseEntity } from '@/api/generated';
import {
   AUTH_QUERY_KEY,
   getAuthSession,
   getAuthSessionEndReason,
} from '@/features/auth/auth-query';
import { getLoginSearchAfterSessionEnd, getSafeRedirect } from '@/features/auth/utils/redirect';
import { queryClient } from '@/utils/query-client';

const PUBLIC_PATHS = [
   /^\/login$/u,
   /^\/forgot-password$/u,
   /^\/reset-password/u,
   /^\/invitation\//u,
];

const isPublicPath = (pathname: string) => PUBLIC_PATHS.some((re) => re.test(pathname));

const getRedirectSearchParam = (location: ParsedLocation) =>
   getSafeRedirect((location.search as { redirect?: unknown }).redirect);

export const protectRoutes = (router: AnyRouter) => {
   const handleChange = (auth: AuthResponseEntity | null | undefined, location: ParsedLocation) => {
      if (!auth?.accessToken && !isPublicPath(location.pathname)) {
         void router.navigate({
            to: '/login',
            search: getLoginSearchAfterSessionEnd(location.href, getAuthSessionEndReason()),
         });
      }
      if (auth?.accessToken && isPublicPath(location.pathname)) {
         void router.navigate({ href: getRedirectSearchParam(location) ?? '/' });
      }
   };

   const authUnsub = new QueryObserver<AuthResponseEntity | null>(queryClient, {
      queryKey: AUTH_QUERY_KEY,
      notifyOnChangeProps: ['data'],
   }).subscribe((state) => {
      handleChange(state.data, router.state.location);
   });

   const routerUnsub = router.subscribe('onBeforeLoad', (e) => {
      handleChange(getAuthSession(), e.toLocation);
   });

   return () => {
      authUnsub();
      routerUnsub();
   };
};
