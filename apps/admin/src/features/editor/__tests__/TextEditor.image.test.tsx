import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Editor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FileEntity } from '@/api/generated';
import { QueryWrapper } from '@/test/QueryWrapper';

import { TextEditor } from '../components/TextEditor';

const ORIGINAL_URL = 'https://cdn.test/original.png';
const MEDIUM_URL = 'https://cdn.test/medium.webp';

const FILE = {
   originalName: 'photo.png',
   displayName: null,
   altText: 'A cat',
   mimeType: 'image/png',
   publicUrl: ORIGINAL_URL,
   variants: [{ variant: 'medium', publicUrl: MEDIUM_URL }],
} as unknown as FileEntity;

const mutateAsync = vi.fn();

vi.mock('@/features/files/hooks/useUploadFile', () => ({
   useUploadFile: () => ({ mutateAsync }),
}));

vi.mock('@/features/files/components/FilePickerDialog', () => ({
   FilePickerDialog: ({
      open,
      onSelect,
   }: {
      open: boolean;
      onSelect: (file: FileEntity) => void;
   }) =>
      open ? (
         <button type="button" onClick={() => onSelect(FILE)}>
            Pick file
         </button>
      ) : null,
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

const renderEditor = async () => {
   const onChange = vi.fn();
   render(<TextEditor content="<p></p>" onChange={onChange} />, { wrapper: QueryWrapper });
   await screen.findByRole('button', { name: 'Bold' });
   return { user: userEvent.setup(), onChange };
};

const getContentElement = () => {
   const element = document.querySelector('.ProseMirror');
   if (!element) throw new Error('The editor content is not rendered');
   return element;
};

const expectLinkedImage = async (onChange: ReturnType<typeof vi.fn>) => {
   await waitFor(() => expect(onChange).toHaveBeenCalled());
   const html = onChange.mock.calls.at(-1)?.[0] as string;
   expect(html).toContain(`href="${ORIGINAL_URL}"`);
   expect(html).toContain(`src="${MEDIUM_URL}"`);
   expect(html).toContain('alt="A cat"');
   expect(html).toContain('target="_blank"');
   expect(html).toMatch(/<a [^>]*><img /);
};

describe('TextEditor image insertion', () => {
   beforeEach(() => {
      mutateAsync.mockReset();
      mutateAsync.mockResolvedValue(FILE);
   });

   afterEach(() => {
      vi.restoreAllMocks();
   });

   it('should insert a picked file as a link to the original with the medium variant', async () => {
      const { user, onChange } = await renderEditor();

      await user.click(screen.getByRole('button', { name: 'Image' }));
      await user.click(screen.getByRole('button', { name: 'Pick file' }));

      await expectLinkedImage(onChange);
   });

   it('should insert an uploaded file the same way', async () => {
      const { onChange } = await renderEditor();
      const file = new File(['x'], 'photo.png', { type: 'image/png' });

      document.elementFromPoint = () => getContentElement();
      const event = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', {
         value: { getData: () => '', types: ['Files'], files: [file], items: [] },
      });
      fireEvent(getContentElement(), event);

      await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ file }));
      await expectLinkedImage(onChange);
   });

   it('should insert a pasted image the same way', async () => {
      const { onChange } = await renderEditor();
      const file = new File(['x'], 'photo.png', { type: 'image/png' });

      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', {
         value: {
            getData: () => '',
            types: ['Files'],
            files: [file],
            items: [{ type: 'image/png', getAsFile: () => file }],
         },
      });
      fireEvent(getContentElement(), event);

      await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ file }));
      await expectLinkedImage(onChange);
   });

   it('should insert a dropped image next to the paragraph it was dropped on', async () => {
      const onChange = vi.fn();
      render(<TextEditor content="<p>one</p><p>two</p><p>three</p>" onChange={onChange} />, {
         wrapper: QueryWrapper,
      });
      await screen.findByRole('button', { name: 'Bold' });
      const view = (getContentElement() as Element & { editor: Editor }).editor.view;
      vi.spyOn(view, 'posAtCoords').mockReturnValue({ pos: 2, inside: 0 });
      const file = new File(['x'], 'photo.png', { type: 'image/png' });

      const event = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', {
         value: { getData: () => '', types: ['Files'], files: [file], items: [] },
      });
      fireEvent(getContentElement(), event);

      await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ file }));
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const html = onChange.mock.calls.at(-1)?.[0] as string;
      expect(html).toMatch(
         /<p>one<\/p><p>(<a [^>]*>)?<img [^>]*>(<\/a>)?<\/p><p>two<\/p><p>three<\/p>/,
      );
   });
});
