import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { ADMIN_ROLE, createRole, createUser } from '@/test/fixtures';

import { UserTable } from '../components/UserTable';

const EDITOR = createRole(['users.read', 'users.update', 'users.delete', 'projects.read']);
const READER = createRole(['projects.read'], { id: 3, name: 'reader' });
const PUBLISHER = createRole(['projects.publish'], { id: 4, name: 'publisher' });

const ACTOR = createUser(EDITOR, { id: 10, firstName: 'Self' });
const USERS = [
   ACTOR,
   createUser(ADMIN_ROLE, { id: 11, firstName: 'Admin' }),
   createUser(READER, { id: 12, firstName: 'Reader' }),
   createUser(PUBLISHER, { id: 13, firstName: 'Publisher' }),
   createUser(READER, { id: 14, firstName: 'Invited', acceptedInvitationAt: null }),
   createUser(READER, {
      id: 15,
      firstName: 'Suspended',
      deactivatedAt: '2026-11-01T10:00:00.000Z',
   }),
];

const EDIT = 'Edit';
const CHANGE_ROLE = 'Change role';
const DELETE = 'Delete user';
const DEACTIVATE = 'Deactivate user';
const REACTIVATE = 'Reactivate user';

const renderTable = (props: Partial<ComponentProps<typeof UserTable>> = {}) =>
   render(
      <UserTable
         data={USERS}
         totalCount={USERS.length}
         pagination={{ pageIndex: 0, pageSize: 10 }}
         onPaginationChange={vi.fn()}
         sorting={[]}
         onSortingChange={vi.fn()}
         actor={ACTOR}
         onEdit={vi.fn()}
         onDelete={vi.fn()}
         onResend={vi.fn()}
         onChangeRole={vi.fn()}
         onDeactivate={vi.fn()}
         onReactivate={vi.fn()}
         emptyState={null}
         {...props}
      />,
      { wrapper: TooltipProvider },
   );

const rowOf = (firstName: string) => {
   const row = screen.getByText(new RegExp(`^${firstName} `)).closest('tr');
   if (!row) throw new Error(`No row of ${firstName}`);
   return within(row);
};

const actionsOf = (firstName: string) =>
   rowOf(firstName)
      .queryAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));

describe('UserTable', () => {
   it('should offer the actions only on users the actor may manage', () => {
      renderTable();

      expect(actionsOf('Self')).toEqual([]);
      expect(actionsOf('Admin')).toEqual([]);
      expect(actionsOf('Publisher')).toEqual([]);
      expect(actionsOf('Reader')).toEqual([EDIT, CHANGE_ROLE, DEACTIVATE, DELETE]);
      expect(actionsOf('Invited')).toEqual([
         EDIT,
         'Resend invitation',
         CHANGE_ROLE,
         DEACTIVATE,
         DELETE,
      ]);
      expect(actionsOf('Suspended')).toEqual([EDIT, CHANGE_ROLE, REACTIVATE, DELETE]);
   });

   it('should mark a deactivated user with a badge', () => {
      renderTable();

      expect(rowOf('Suspended').getByText('Deactivated')).toBeInTheDocument();
      expect(rowOf('Reader').queryByText('Deactivated')).not.toBeInTheDocument();
   });

   it('should call back with the user on deactivation and reactivation', async () => {
      const onDeactivate = vi.fn();
      const onReactivate = vi.fn();
      renderTable({ onDeactivate, onReactivate });

      await userEvent.click(rowOf('Reader').getByRole('button', { name: DEACTIVATE }));
      await userEvent.click(rowOf('Suspended').getByRole('button', { name: REACTIVATE }));

      expect(onDeactivate).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }));
      expect(onReactivate).toHaveBeenCalledWith(expect.objectContaining({ id: 15 }));
   });

   it('should leave out the actions the role may not take', () => {
      renderTable({
         onEdit: undefined,
         onResend: undefined,
         onChangeRole: undefined,
         onDeactivate: undefined,
         onReactivate: undefined,
      });

      expect(actionsOf('Reader')).toEqual([DELETE]);
      expect(actionsOf('Invited')).toEqual([DELETE]);
   });

   it('should offer nothing until the signed-in user is known', () => {
      renderTable({ actor: null });

      expect(screen.queryAllByRole('button', { name: /edit|delete|role|invitation/i })).toEqual([]);
   });
});
