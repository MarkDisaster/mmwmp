import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/api';
import { roleControllerFindOne } from '@/api/generated';
import { createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { ApprovalTile } from '../ApprovalTile';

vi.mock('@/api/generated', async (importOriginal) => ({
   ...(await importOriginal<typeof import('@/api/generated')>()),
   roleControllerFindOne: vi.fn(),
}));

afterEach(() => {
   queryClient.clear();
   vi.clearAllMocks();
});

const renderApproval = (toolName: string, input: unknown) =>
   render(
      <ApprovalTile
         toolName={toolName}
         input={input}
         approvalId="ap1"
         addToolApprovalResponse={vi.fn()}
      />,
      { wrapper: QueryWrapper },
   );

const tileText = (container: HTMLElement) =>
   Array.from(container.querySelectorAll('span.font-semibold, span.font-mono, p, li')).map(
      (node) => node.textContent,
   );

const renderTile = (count: number) =>
   renderApproval('updateFiles', {
      files: Array.from({ length: count }, (_, i) => ({
         id: i + 1,
         currentName: `f${i}.png`,
         altText: `Popis ${i}`,
      })),
   });

describe('ApprovalTile for updateFiles', () => {
   it('should list the first changes and let the user read all of them before approving', async () => {
      renderTile(12);

      expect(screen.getAllByRole('listitem')).toHaveLength(9);
      expect(screen.queryByText(/f11\.png/)).not.toBeInTheDocument();

      await userEvent.click(
         screen.getByRole('button', { name: /show all changes|zobrazit všechny/i }),
      );

      expect(screen.getAllByRole('listitem')).toHaveLength(12);
      expect(screen.getByText(/f11\.png: alt → "Popis 11"/)).toBeInTheDocument();
   });

   it('should expose the state of the disclosure: aria-expanded and aria-controls the list', async () => {
      renderTile(12);
      const toggle = screen.getByRole('button', { name: /show all changes|zobrazit všechny/i });
      const list = screen.getAllByRole('list')[0];

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveAttribute('aria-controls', list.id);
      expect(list.id).not.toBe('');

      await userEvent.click(toggle);

      expect(screen.getByRole('button', { name: /show less|méně/i })).toHaveAttribute(
         'aria-expanded',
         'true',
      );
   });

   it('should offer no toggle when everything is already listed', () => {
      renderTile(3);

      expect(screen.queryByRole('button', { name: /show all|zobrazit všechny/i })).toBeNull();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
   });
});

describe('ApprovalTile for setRolePermissions', () => {
   const INPUT = {
      id: 3,
      permissions: [
         { resource: 'projects', action: 'read' },
         { resource: 'projects', action: 'publish' },
      ],
   };

   it('should say what the call grants and revokes against the role fetched when the tile opens', async () => {
      vi.mocked(roleControllerFindOne).mockResolvedValue({
         data: createRole(['projects.read', 'users.delete'], { id: 3, name: 'Editor' }),
      } as Awaited<ReturnType<typeof roleControllerFindOne>>);

      const { container } = renderApproval('setRolePermissions', INPUT);

      expect(await screen.findByText('Grant (1):')).toBeInTheDocument();
      expect(roleControllerFindOne).toHaveBeenCalledWith(3);
      expect(tileText(container)).toMatchInlineSnapshot(`
        [
          "setRolePermissions",
          "Role: Editor (id 3)",
          "Grant (1):",
          "Projects: Publish",
          "Revoke (1):",
          "Users: Delete",
        ]
      `);
   });

   it('should list the whole new set instead of a diff against a cached role not refetched yet', () => {
      queryClient.setQueryData(
         api.roles.queries.detail(3).queryKey,
         createRole(['projects.read', 'projects.publish'], { id: 3, name: 'Editor' }),
      );
      vi.mocked(roleControllerFindOne).mockReturnValue(new Promise(() => {}));

      const { container } = renderApproval('setRolePermissions', INPUT);

      expect(screen.queryByText(/permissions do not change/)).toBeNull();
      expect(tileText(container)).toMatchInlineSnapshot(`
        [
          "setRolePermissions",
          "Role id 3",
          "Whole new permission set (2). The current one is not loaded, the role loses everything not listed:",
          "Projects: Publish",
          "Projects: Read",
        ]
      `);
   });
});

describe('ApprovalTile for deactivateUser', () => {
   it('should name the user by name and e-mail when the admin has the user cached', () => {
      queryClient.setQueryData(
         api.users.queries.detail(10).queryKey,
         createUser(createRole([]), { id: 10 }),
      );

      const { container } = renderApproval('deactivateUser', { id: 10 });

      expect(tileText(container)).toMatchInlineSnapshot(`
        [
          "deactivateUser",
          "User: Jana Nováková (jana@example.com, id 10)",
        ]
      `);
   });

   it('should show the id and say the name is not loaded when the user is not cached', () => {
      const { container } = renderApproval('deactivateUser', { id: 10 });

      expect(tileText(container)).toMatchInlineSnapshot(`
        [
          "deactivateUser",
          "User id 10 (name not loaded in the admin)",
        ]
      `);
   });

   it('should not query a role for a tool that changes none', () => {
      renderApproval('deactivateUser', { id: 10 });

      expect(roleControllerFindOne).not.toHaveBeenCalled();
      expect(
         queryClient.getQueryCache().find({ queryKey: ['roles', 'detail', 0] }),
      ).toBeUndefined();
      expect(queryClient.getQueryState(['roles', 'detail', null])?.fetchStatus).toBe('idle');
   });
});

describe('ApprovalTile for an input with more flat keys', () => {
   it('should keep the name of every key', () => {
      const { container } = renderApproval('setRunnerScoreVisibility', { id: 3, hidden: false });

      expect(tileText(container)).toMatchInlineSnapshot(`
        [
          "setRunnerScoreVisibility",
          "(id: 3; hidden: false)",
        ]
      `);
   });
});
