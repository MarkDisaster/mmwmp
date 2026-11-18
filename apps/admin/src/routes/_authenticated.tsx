import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { getAuthSession } from '@/features/auth/auth-query';
import { getLoginSearch } from '@/features/auth/utils/redirect';
import { Layout } from '@/features/layout/components/Layout';

export const Route = createFileRoute('/_authenticated')({
   beforeLoad: ({ location }) => {
      if (!getAuthSession()?.accessToken) {
         throw redirect({ to: '/login', search: getLoginSearch(location.href) });
      }
   },
   component: RouteComponent,
});

function RouteComponent() {
   return (
      <Layout>
         <Outlet />
      </Layout>
   );
}
