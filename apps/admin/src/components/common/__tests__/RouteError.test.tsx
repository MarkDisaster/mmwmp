import {
   createMemoryHistory,
   createRootRoute,
   createRoute,
   createRouter,
   Outlet,
   RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RouteError } from '../RouteError';

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@sentry/react', () => ({ captureException }));

const failure = new Error('loader exploded');

const renderFailingRoute = async (where: 'component' | 'loader') => {
   const onCaughtError = vi.fn();
   const rootRoute = createRootRoute({ component: Outlet });
   const fail = () => {
      throw failure;
   };
   const route = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      ...(where === 'loader' ? { loader: fail, component: () => null } : { component: fail }),
      errorComponent: RouteError,
   });
   const router = createRouter({
      routeTree: rootRoute.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
   });
   render(<RouterProvider router={router} />, { onCaughtError });
   await screen.findByRole('alert');
   return onCaughtError;
};

describe('RouteError', () => {
   afterEach(() => captureException.mockClear());

   it.each(['component', 'loader'] as const)(
      'should leave the report of an error in the %s to onCaughtError of the root',
      async (where) => {
         const onCaughtError = await renderFailingRoute(where);
         expect(onCaughtError).toHaveBeenCalledWith(failure, expect.anything());
         expect(captureException).not.toHaveBeenCalled();
      },
   );
});
