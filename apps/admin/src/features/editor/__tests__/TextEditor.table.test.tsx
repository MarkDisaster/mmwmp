import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { QueryWrapper } from '@/test/QueryWrapper';

import { TextEditor } from '../components/TextEditor';

vi.mock('@/features/files/hooks/useUploadFile', () => ({
   useUploadFile: () => ({ mutateAsync: vi.fn() }),
}));

Range.prototype.getClientRects ??= () =>
   Object.assign([], { item: () => null }) as unknown as DOMRectList;
Range.prototype.getBoundingClientRect ??= () => ({
   x: 0,
   y: 0,
   width: 0,
   height: 0,
   top: 0,
   right: 0,
   bottom: 0,
   left: 0,
   toJSON: () => ({}),
});

const LABELS = {
   table: 'Table',
   addRow: 'Add row',
   addColumn: 'Add column',
   deleteRow: 'Delete row',
   deleteColumn: 'Delete column',
   deleteTable: 'Delete table',
};

const renderEditor = async (content = '<p></p>') => {
   const onChange = vi.fn();
   const view = render(<TextEditor content={content} onChange={onChange} />, {
      wrapper: QueryWrapper,
   });
   await screen.findByRole('button', { name: 'Bold' });
   return { user: userEvent.setup(), onChange, ...view };
};

const getButton = (name: string) => screen.getByRole('button', { name });

const getContentElement = () => {
   const element = document.querySelector('.ProseMirror');
   if (!element) throw new Error('The editor content is not rendered');
   return element;
};

const lastHtml = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.calls.at(-1)?.[0] as string;

const insertTable = async (user: ReturnType<typeof userEvent.setup>) => {
   await user.click(getButton(LABELS.table));
   await waitFor(() => expect(getContentElement().querySelector('table')).not.toBeNull());
};

const countRows = () => getContentElement().querySelectorAll('tr').length;
const countCellsInFirstRow = () =>
   getContentElement().querySelectorAll('tr:first-child > *').length;

describe('TextEditor tables', () => {
   it('should insert a 3 x 3 table with a header row', async () => {
      const { user } = await renderEditor();

      await insertTable(user);

      const content = getContentElement();
      expect(content.querySelectorAll('table')).toHaveLength(1);
      const rows = content.querySelectorAll('tr');
      expect(rows).toHaveLength(3);
      rows.forEach((row) => expect(row.children).toHaveLength(3));
      expect(rows[0]?.querySelectorAll('th')).toHaveLength(3);
      expect(rows[1]?.querySelectorAll('td')).toHaveLength(3);
   });

   it('should enable the row, column and delete buttons only with the cursor in a table', async () => {
      const { user } = await renderEditor();
      const editButtons = [
         LABELS.addRow,
         LABELS.addColumn,
         LABELS.deleteRow,
         LABELS.deleteColumn,
         LABELS.deleteTable,
      ];

      expect(getButton(LABELS.table)).toBeEnabled();
      editButtons.forEach((name) => expect(getButton(name)).toBeDisabled());

      await insertTable(user);

      await waitFor(() => editButtons.forEach((name) => expect(getButton(name)).toBeEnabled()));
   });

   it('should add a row after the cursor row', async () => {
      const { user } = await renderEditor();
      await insertTable(user);

      await user.click(getButton(LABELS.addRow));

      await waitFor(() => expect(countRows()).toBe(4));
   });

   it('should add a column', async () => {
      const { user } = await renderEditor();
      await insertTable(user);

      await user.click(getButton(LABELS.addColumn));

      await waitFor(() => expect(countCellsInFirstRow()).toBe(4));
   });

   it('should delete a row', async () => {
      const { user } = await renderEditor();
      await insertTable(user);

      await user.click(getButton(LABELS.deleteRow));

      await waitFor(() => expect(countRows()).toBe(2));
   });

   it('should delete a column', async () => {
      const { user } = await renderEditor();
      await insertTable(user);

      await user.click(getButton(LABELS.deleteColumn));

      await waitFor(() => expect(countCellsInFirstRow()).toBe(2));
   });

   it('should delete the table', async () => {
      const { user, onChange } = await renderEditor();
      await insertTable(user);

      await user.click(getButton(LABELS.deleteTable));

      await waitFor(() => expect(getContentElement().querySelector('table')).toBeNull());
      expect(lastHtml(onChange)).not.toContain('<table');
   });

   it('should round-trip a table through getHTML and setContent', async () => {
      const { user, onChange, unmount } = await renderEditor('<p>x</p>');
      await insertTable(user);
      await waitFor(() => {
         expect(getContentElement()).toHaveFocus();
         expect(getButton(LABELS.addRow)).toBeEnabled();
      });
      await user.keyboard('a');
      await waitFor(() => expect(lastHtml(onChange)).toMatch(/<th[^>]*><p>a<\/p>/));
      const html = lastHtml(onChange);
      unmount();

      render(<TextEditor content={html} onChange={vi.fn()} />, { wrapper: QueryWrapper });
      await screen.findByRole('button', { name: 'Bold' });
      expect(countRows()).toBe(3);
      expect(countCellsInFirstRow()).toBe(3);
      expect(getContentElement().querySelectorAll('th')).toHaveLength(3);
      expect(getContentElement().querySelector('th')).toHaveTextContent('a');
   });
});
