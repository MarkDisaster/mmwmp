import {
   createMemoryHistory,
   createRootRoute,
   createRoute,
   createRouter,
   Outlet,
   RouterProvider,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TrashedItemEntity } from '@/api/generated';
import * as generated from '@/api/generated';
import { Route } from '@/routes/_authenticated/trash/index';
import { signInAs } from '@/test/auth';
import { ADMIN_ROLE, createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { TrashPage } from '../components/TrashPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/api/generated', async (importOriginal) => {
   const original = await importOriginal<typeof import('@/api/generated')>();
   return {
      ...original,
      projectControllerFindTrashed: vi.fn(),
      projectControllerRestore: vi.fn(),
      projectControllerRemovePermanently: vi.fn(),
      serviceControllerFindTrashed: vi.fn(),
      tagControllerFindTrashed: vi.fn(),
      fileControllerFindTrashed: vi.fn(),
      fileControllerRemovePermanently: vi.fn(),
   };
});

const TIMESTAMP = '2026-01-01T00:00:00.000Z';
const PROJECTS_DELETE = 'projects.delete';
const DELETE_PERMANENTLY = 'Delete permanently';

const item = (id: number, overrides: Partial<TrashedItemEntity> = {}): TrashedItemEntity => ({
   id,
   title: `Item ${id}`,
   originalSlug: `item-${id}`,
   deletedAt: TIMESTAMP,
   deletedBy: { id: 1, firstName: 'Jana', lastName: 'Nováková' },
   daysLeft: 20,
   ...overrides,
});

const page = (data: TrashedItemEntity[]) => ({ data: { data, totalCount: data.length } });
const asResponse = (data: unknown) => ({ data }) as never;

const openTrash = async (initial = '/trash') => {
   const rootRoute = createRootRoute({ component: Outlet });
   const layoutRoute = createRoute({
      getParentRoute: () => rootRoute,
      id: '_authenticated',
      component: Outlet,
   });
   const trashRoute = createRoute({
      getParentRoute: () => layoutRoute,
      path: 'trash/',
      validateSearch: Route.options.validateSearch,
      component: TrashPage,
   });
   const router = createRouter({
      routeTree: rootRoute.addChildren([layoutRoute.addChildren([trashRoute])]),
      history: createMemoryHistory({ initialEntries: [initial] }),
   });
   render(<RouterProvider router={router} />, { wrapper: QueryWrapper });
   return router;
};

describe('TrashPage', () => {
   beforeEach(() => {
      vi.mocked(generated.projectControllerFindTrashed).mockResolvedValue(
         asResponse(page([item(1), item(2, { deletedBy: null, daysLeft: 0 })]).data),
      );
      vi.mocked(generated.serviceControllerFindTrashed).mockResolvedValue(
         asResponse({ data: [], totalCount: 0 }),
      );
      vi.mocked(generated.tagControllerFindTrashed).mockResolvedValue(
         asResponse({ data: [], totalCount: 0 }),
      );
      vi.mocked(generated.fileControllerFindTrashed).mockResolvedValue(
         asResponse({ data: [], totalCount: 0 }),
      );
   });

   afterEach(() => {
      queryClient.clear();
      vi.clearAllMocks();
   });

   it('should show one tab for each resource whose delete permission the role holds', async () => {
      signInAs(createUser(createRole(['tags.delete', 'files.delete'])));
      await openTrash();

      expect(await screen.findByRole('tab', { name: 'Tags' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Files' })).toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Projects' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Services' })).not.toBeInTheDocument();
      expect(generated.tagControllerFindTrashed).toHaveBeenCalled();
      expect(generated.projectControllerFindTrashed).not.toHaveBeenCalled();
   });

   it('should show all four tabs for the admin role and load the tab that is clicked', async () => {
      signInAs(createUser(ADMIN_ROLE));
      await openTrash();

      await screen.findByRole('tab', { name: 'Projects' });
      expect(screen.getAllByRole('tab')).toHaveLength(4);

      await userEvent.click(screen.getByRole('tab', { name: 'Files' }));

      await vi.waitFor(() => expect(generated.fileControllerFindTrashed).toHaveBeenCalled());
   });

   it('should list the name, the original slug, who deleted it and the days left', async () => {
      signInAs(createUser(createRole([PROJECTS_DELETE])));
      await openTrash();

      const first = (await screen.findByText('Item 1')).closest('tr') as HTMLElement;
      expect(within(first).getByText('item-1')).toBeInTheDocument();
      expect(within(first).getByText('Jana Nováková')).toBeInTheDocument();
      expect(within(first).getByText('20 days')).toBeInTheDocument();
      expect(within(first).getByRole('button', { name: 'Restore' })).toBeInTheDocument();
      expect(within(first).getByRole('button', { name: DELETE_PERMANENTLY })).toBeInTheDocument();

      const second = screen.getByText('Item 2').closest('tr') as HTMLElement;
      expect(within(second).getByText('Unknown')).toBeInTheDocument();
      expect(within(second).getByText('Today')).toBeInTheDocument();
   });

   it('should show the empty state when the trash has nothing of that kind', async () => {
      signInAs(createUser(createRole(['services.delete'])));
      await openTrash();

      expect(await screen.findByText('The trash is empty')).toBeInTheDocument();
   });

   it('should restore after the confirmation and say so', async () => {
      signInAs(createUser(createRole([PROJECTS_DELETE])));
      vi.mocked(generated.projectControllerRestore).mockResolvedValue(asResponse({}));
      await openTrash();

      const row = (await screen.findByText('Item 1')).closest('tr') as HTMLElement;
      await userEvent.click(within(row).getByRole('button', { name: 'Restore' }));
      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Restore "Item 1"')).toBeInTheDocument();
      expect(generated.projectControllerRestore).not.toHaveBeenCalled();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));

      await vi.waitFor(() => expect(generated.projectControllerRestore).toHaveBeenCalledWith(1));
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Restored from trash'));
   });

   it('should explain that the slug is taken when the restore is answered with 409', async () => {
      signInAs(createUser(createRole([PROJECTS_DELETE])));
      vi.mocked(generated.projectControllerRestore).mockRejectedValue(
         new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
            status: 409,
         } as never),
      );
      await openTrash();

      const row = (await screen.findByText('Item 1')).closest('tr') as HTMLElement;
      await userEvent.click(within(row).getByRole('button', { name: 'Restore' }));
      await userEvent.click(
         within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Restore' }),
      );

      await vi.waitFor(() =>
         expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('used by another item')),
      );
   });

   it('should delete permanently only after the confirmation', async () => {
      signInAs(createUser(createRole([PROJECTS_DELETE])));
      vi.mocked(generated.projectControllerRemovePermanently).mockResolvedValue(
         asResponse(undefined),
      );
      await openTrash();

      const row = (await screen.findByText('Item 1')).closest('tr') as HTMLElement;
      await userEvent.click(within(row).getByRole('button', { name: DELETE_PERMANENTLY }));
      const dialog = await screen.findByRole('alertdialog');
      expect(generated.projectControllerRemovePermanently).not.toHaveBeenCalled();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(generated.projectControllerRemovePermanently).not.toHaveBeenCalled();

      await userEvent.click(within(row).getByRole('button', { name: DELETE_PERMANENTLY }));
      await userEvent.click(
         within(await screen.findByRole('alertdialog')).getByRole('button', {
            name: DELETE_PERMANENTLY,
         }),
      );

      await vi.waitFor(() =>
         expect(generated.projectControllerRemovePermanently).toHaveBeenCalledWith(1),
      );
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Deleted permanently'));
   });

   it('should say a file is still in use when its permanent delete is answered with 409', async () => {
      signInAs(createUser(createRole(['files.delete'])));
      vi.mocked(generated.fileControllerFindTrashed).mockResolvedValue(
         asResponse({ data: [item(7, { title: 'hero.jpg', originalSlug: null })], totalCount: 1 }),
      );
      vi.mocked(generated.fileControllerRemovePermanently).mockRejectedValue(
         new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
            status: 409,
         } as never),
      );
      await openTrash();

      const row = (await screen.findByText('hero.jpg')).closest('tr') as HTMLElement;
      await userEvent.click(within(row).getByRole('button', { name: DELETE_PERMANENTLY }));
      await userEvent.click(
         within(await screen.findByRole('alertdialog')).getByRole('button', {
            name: DELETE_PERMANENTLY,
         }),
      );

      await vi.waitFor(() =>
         expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('still uses this file')),
      );
   });
});
