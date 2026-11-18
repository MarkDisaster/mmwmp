import { QueryErrorResetBoundary, useQueryErrorResetBoundary } from '@tanstack/react-query';
import {
   createMemoryHistory,
   createRootRoute,
   createRoute,
   createRouter,
   notFound,
   Outlet,
   RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Route } from '@/routes/_authenticated/tags/$tagId';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const openTag = async (loadTag: () => never) => {
   const rootRoute = createRootRoute({ component: Outlet });
   const listRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/tags',
      component: () => (
         <>
            <h1>Tags</h1>
            <Outlet />
         </>
      ),
   });
   const tagRoute = createRoute({
      getParentRoute: () => listRoute,
      path: '$tagId',
      loader: loadTag,
      component: () => <p>Tag dialog</p>,
      notFoundComponent: Route.options.notFoundComponent,
      errorComponent: Route.options.errorComponent,
   });
   const router = createRouter({
      routeTree: rootRoute.addChildren([listRoute.addChildren([tagRoute])]),
      history: createMemoryHistory({
         initialEntries: ['/tags', '/tags/5?page=2'],
         initialIndex: 1,
      }),
   });
   let resetBoundary: ReturnType<typeof useQueryErrorResetBoundary> | undefined;
   const ResetBoundaryProbe = () => {
      resetBoundary = useQueryErrorResetBoundary();
      return null;
   };

   render(
      <QueryErrorResetBoundary>
         <ResetBoundaryProbe />
         <RouterProvider router={router} />
      </QueryErrorResetBoundary>,
   );
   await screen.findByRole('heading', { name: 'Tags' });
   return { router, isQueryErrorReset: () => resetBoundary?.isReset() };
};

describe('tag detail route', () => {
   beforeEach(() => {
      vi.mocked(toast.error).mockClear();
   });

   afterEach(() => {
      vi.restoreAllMocks();
   });

   it('should go back to the list with a toast when the tag does not exist', async () => {
      const { router, isQueryErrorReset } = await openTag(() => {
         throw notFound();
      });

      await vi.waitFor(() => expect(router.state.location.pathname).toBe('/tags'));
      expect(toast.error).toHaveBeenCalledWith('The tag does not exist or was deleted', {
         id: 'tags.toast.notFound',
      });
      expect(router.state.location.search).toEqual({ page: 2 });
      expect(router.history.length).toBe(2);
      expect(isQueryErrorReset()).toBe(true);
   });

   it('should go back to the list with a toast when the tag failed to load', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { router } = await openTag(() => {
         throw new Error('Network Error');
      });

      await vi.waitFor(() => expect(router.state.location.pathname).toBe('/tags'));
      expect(toast.error).toHaveBeenCalledWith('Failed to load the tag', {
         id: 'tags.toast.loadFailed',
      });
   });
});
