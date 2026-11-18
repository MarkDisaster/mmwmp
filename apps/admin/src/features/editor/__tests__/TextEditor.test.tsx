import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { QueryWrapper } from '@/test/QueryWrapper';

import { TextEditor } from '../components/TextEditor';

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

const TOOLBAR = [
   'Bold',
   'Italic',
   'Strikethrough',
   'Heading 2',
   'Heading 3',
   'Bullet list',
   'Numbered list',
   'Link',
   'Image',
   'Table',
   'Add row',
   'Add column',
   'Delete row',
   'Delete column',
   'Delete table',
   'HTML source',
   'Undo',
   'Redo',
];

const PRESSED = 'aria-pressed';

const renderEditor = async (content = '<p>Hello</p>') => {
   const onChange = vi.fn();
   render(<TextEditor content={content} onChange={onChange} />, { wrapper: QueryWrapper });
   await screen.findByRole('button', { name: 'Bold' });
   return { user: userEvent.setup(), onChange };
};

describe('TextEditor toolbar', () => {
   it('should show the buttons in the order of the toolbar', async () => {
      await renderEditor();

      expect(
         screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
      ).toEqual(TOOLBAR);
   });

   it('should mark no format as active in plain text and keep the link off without a selection', async () => {
      await renderEditor();

      for (const name of TOOLBAR.slice(0, 7)) {
         expect(screen.getByRole('button', { name })).toHaveAttribute(PRESSED, 'false');
      }
      expect(screen.getByRole('button', { name: 'Link' })).toBeDisabled();
   });

   it.each([
      ['Heading 2', /^<h2>Hello<\/h2>/],
      ['Heading 3', /^<h3>Hello<\/h3>/],
      ['Bullet list', /^<ul><li><p>Hello<\/p><\/li><\/ul>/],
      ['Numbered list', /^<ol><li><p>Hello<\/p><\/li><\/ol>/],
   ])('should apply %s to the paragraph and show the button as active', async (name, html) => {
      const { user, onChange } = await renderEditor();

      await user.click(screen.getByRole('button', { name }));

      expect(onChange).toHaveBeenLastCalledWith(expect.stringMatching(html));
      await waitFor(() => {
         expect(screen.getByRole('button', { name })).toHaveAttribute(PRESSED, 'true');
      });
   });

   it.each(['Bold', 'Italic', 'Strikethrough'])(
      'should turn %s on for the text typed next',
      async (name) => {
         const { user } = await renderEditor();

         await user.click(screen.getByRole('button', { name }));

         await waitFor(() => {
            expect(screen.getByRole('button', { name })).toHaveAttribute(PRESSED, 'true');
         });
      },
   );
});
