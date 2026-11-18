import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TagEntity } from '@/api/generated';
import { TooltipProvider } from '@/components/ui/tooltip';
import { signInAs } from '@/test/auth';
import { createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { TagFormDialog } from '../components/TagFormDialog';
import { TagTable } from '../components/TagTable';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

const createTag = (id: number): TagEntity => ({
   id,
   translations: [{ language: 'cs', name: `Tag ${id}` }],
   slug: `tag-${id}`,
   color: null,
   sortOrder: id,
   createdAt: TIMESTAMP,
   updatedAt: TIMESTAMP,
   version: 0,
});

const READER = createRole(['tags.read']);
const UPDATER = createRole(['tags.read', 'tags.update']);
const CREATOR = createRole(['tags.read', 'tags.create']);
const NO_PERMISSION_NOTICE = "You don't have permission to change this record.";

afterEach(() => {
   queryClient.clear();
});

describe('TagFormDialog', () => {
   const renderDialog = (tag?: TagEntity) =>
      render(<TagFormDialog open tag={tag} onClose={vi.fn()} />, { wrapper: QueryWrapper });

   it('should show a tag read-only to a role without the update permission', () => {
      signInAs(createUser(READER));
      renderDialog(createTag(1));

      expect(screen.getByRole('status')).toHaveTextContent(NO_PERMISSION_NOTICE);
      expect(screen.getByRole('textbox', { name: 'Name (Czech)' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
      expect(screen.getByText('Close', { selector: 'button' })).toBeEnabled();
   });

   it('should keep a tag editable with the update permission, there is no publish lock', () => {
      signInAs(createUser(UPDATER));
      renderDialog(createTag(1));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Name (Czech)' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
   });

   it('should let a role with the create permission open a new tag', () => {
      signInAs(createUser(CREATOR));
      renderDialog();

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
   });

   it('should lock a new tag for a role without the create permission', () => {
      signInAs(createUser(UPDATER));
      renderDialog();

      expect(screen.getByRole('status')).toHaveTextContent(NO_PERMISSION_NOTICE);
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
   });

   it('should offer no status or publish control', () => {
      signInAs(createUser(UPDATER));
      renderDialog(createTag(1));

      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
      expect(screen.queryByText(/publish/i)).not.toBeInTheDocument();
   });
});

describe('TagTable', () => {
   const TAGS = [createTag(1), createTag(2)];

   const renderTable = (props: Partial<ComponentProps<typeof TagTable>> = {}) =>
      render(
         <TagTable
            data={TAGS}
            totalCount={TAGS.length}
            pagination={{ pageIndex: 0, pageSize: 10 }}
            onPaginationChange={vi.fn()}
            sorting={[]}
            onSortingChange={vi.fn()}
            onEdit={vi.fn()}
            emptyState={null}
            {...props}
         />,
         { wrapper: TooltipProvider },
      );

   const rowOf = (name: string) => {
      const row = screen.getByText(name).closest('tr');
      if (!row) throw new Error(`No row of ${name}`);
      return within(row);
   };

   it('should have no delete action and no drag handles without the permissions', () => {
      renderTable();

      expect(screen.queryByRole('button', { name: 'Move tag to trash' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Drag to reorder' })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Edit tag' })).toHaveLength(2);
   });

   it('should show the name in the UI language and fall back to Czech without it', () => {
      renderTable({
         data: [
            {
               ...createTag(3),
               translations: [
                  { language: 'cs', name: 'Případová studie' },
                  { language: 'en', name: 'Case study' },
               ],
            },
            { ...createTag(4), translations: [{ language: 'cs', name: 'Návrh' }] },
         ],
      });

      expect(screen.getByText('Case study')).toBeInTheDocument();
      expect(screen.queryByText('Případová studie')).not.toBeInTheDocument();
      expect(screen.getByText('Návrh')).toBeInTheDocument();
   });

   it('should lock the handle of a row the role may not move', () => {
      renderTable({
         onDelete: vi.fn(),
         reorder: { onReorder: vi.fn(), isRowDisabled: (rowId) => rowId === '2' },
      });

      const handle = (name: string) => rowOf(name).getByRole('button', { name: 'Drag to reorder' });
      expect(handle('Tag 1')).not.toHaveAttribute('aria-disabled', 'true');
      expect(handle('Tag 2')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getAllByRole('button', { name: 'Move tag to trash' })).toHaveLength(2);
   });
});
