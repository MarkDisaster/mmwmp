import {
   createMemoryHistory,
   createRootRoute,
   createRoute,
   createRouter,
   Outlet,
   RouterProvider,
} from '@tanstack/react-router';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { UnsavedChangesGuard } from '../UnsavedChangesGuard';

const LEAVE = 'Leave without saving';
const STAY = 'Stay on the page';

const renderEditor = async (when: boolean) => {
   const rootRoute = createRootRoute({ component: Outlet });
   const editorRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/editor',
      component: () => (
         <>
            <h1>Editor</h1>
            <UnsavedChangesGuard when={when} />
         </>
      ),
   });
   const listRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/list',
      component: () => <h1>List</h1>,
   });
   const router = createRouter({
      routeTree: rootRoute.addChildren([editorRoute, listRoute]),
      history: createMemoryHistory({ initialEntries: ['/editor'] }),
   });
   render(<RouterProvider router={router} />);
   await screen.findByRole('heading', { name: 'Editor' });

   const goTo = (path: string) =>
      act(async () => {
         router.history.push(path);
      });
   return { router, goTo };
};

describe('UnsavedChangesGuard', () => {
   it('should keep the editor open when the user stays', async () => {
      const user = userEvent.setup();
      const { router, goTo } = await renderEditor(true);

      await goTo('/list');
      await user.click(await screen.findByRole('button', { name: STAY }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/editor');
      expect(screen.getByRole('heading', { name: 'Editor' })).toBeInTheDocument();
   });

   it('should leave the editor when the user confirms', async () => {
      const user = userEvent.setup();
      const { router, goTo } = await renderEditor(true);

      await goTo('/list');
      expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/editor');
      await user.click(screen.getByRole('button', { name: LEAVE }));

      expect(await screen.findByRole('heading', { name: 'List' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/list');
   });

   it('should not ask without unsaved changes', async () => {
      const { router, goTo } = await renderEditor(false);

      await goTo('/list');

      expect(await screen.findByRole('heading', { name: 'List' })).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/list');
   });

   it('should not ask when only the search params of the page change', async () => {
      const { router, goTo } = await renderEditor(true);

      await goTo('/editor?tab=en');

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(router.state.location.search).toEqual({ tab: 'en' });
   });
});
