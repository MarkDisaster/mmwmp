import { createFileRoute, redirect } from '@tanstack/react-router';

import { getAuthSession } from '@/features/auth/auth-query';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { getSafeRedirect } from '@/features/auth/utils/redirect';

type LoginSearch = {
   redirect?: string;
};

export const Route = createFileRoute('/login')({
   validateSearch: (search: Record<string, unknown>): LoginSearch => ({
      redirect: getSafeRedirect(search.redirect),
   }),
   beforeLoad: ({ search }) => {
      if (getAuthSession()?.accessToken) {
         throw search.redirect ? redirect({ href: search.redirect }) : redirect({ to: '/' });
      }
   },
   component: LoginPage,
});
