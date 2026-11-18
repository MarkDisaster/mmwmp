import {
   createMemoryHistory,
   createRootRoute,
   createRoute,
   createRouter,
   Outlet,
   RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Route as UsersRoute } from '@/routes/_authenticated/users/index';
import { signInAs } from '@/test/auth';
import { createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

const openUsers = () => {
   const rootRoute = createRootRoute({ component: Outlet });
   const dashboardRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <h1>Dashboard</h1>,
   });
   const usersRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/users',
      beforeLoad: UsersRoute.options.beforeLoad as unknown as () => Promise<void>,
      component: () => <h1>Users</h1>,
   });
   const router = createRouter({
      routeTree: rootRoute.addChildren([dashboardRoute, usersRoute]),
      history: createMemoryHistory({ initialEntries: ['/users'] }),
   });
   render(
      <QueryWrapper>
         <RouterProvider router={router} />
      </QueryWrapper>,
   );
   return router;
};

afterEach(() => {
   queryClient.clear();
});

describe('route permission guard', () => {
   it('should open the page for a role with the permission', async () => {
      signInAs(createUser(createRole(['users.read'])));

      const router = openUsers();

      expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/users');
   });

   it('should send a role without the permission to the dashboard', async () => {
      signInAs(createUser(createRole(['projects.read'])));

      const router = openUsers();

      expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/');
   });
});
