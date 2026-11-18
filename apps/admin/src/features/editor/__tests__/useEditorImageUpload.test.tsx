import { renderHook } from '@testing-library/react';
import Image from '@tiptap/extension-image';
import { Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FileEntity } from '@/api/generated';

import { useEditorImageUpload } from '../hooks/useEditorImageUpload';

const FILE = {
   originalName: 'photo.png',
   displayName: null,
   altText: 'A cat',
   mimeType: 'image/png',
   publicUrl: 'https://cdn.test/original.png',
   variants: [{ variant: 'medium', publicUrl: 'https://cdn.test/medium.webp' }],
} as unknown as FileEntity;

const mutateAsync = vi.fn();

vi.mock('@/features/files/hooks/useUploadFile', () => ({
   useUploadFile: () => ({ mutateAsync }),
}));

vi.mock('sonner', () => ({
   toast: { loading: vi.fn(() => 'id'), dismiss: vi.fn(), error: vi.fn() },
}));

let editor: Editor | undefined;

const createEditor = () => {
   editor = new Editor({
      extensions: [
         StarterKit.configure({ heading: false, link: { openOnClick: false } }),
         Image.configure({ inline: true }),
      ],
      content: '<p>A</p><p>B</p><p>C</p>',
   });
   return editor;
};

const topLevelTexts = (e: Editor) => {
   const blocks: string[] = [];
   e.state.doc.forEach((node) => {
      let image = false;
      node.descendants((child) => {
         if (child.type.name === 'image') image = true;
      });
      blocks.push(`${node.textContent}${image ? '[img]' : ''}`);
   });
   return blocks;
};

const imageFile = () => new File(['x'], 'photo.png', { type: 'image/png' });

describe('useEditorImageUpload with a position', () => {
   beforeEach(() => {
      mutateAsync.mockReset();
   });

   afterEach(() => {
      editor?.destroy();
      editor = undefined;
   });

   it('should map the position over edits made while the upload runs', async () => {
      const e = createEditor();
      const at = 3;
      let resolveUpload: (file: FileEntity) => void = () => undefined;
      mutateAsync.mockReturnValue(new Promise<FileEntity>((resolve) => (resolveUpload = resolve)));
      const offSpy = vi.spyOn(e, 'off');
      const { result } = renderHook(() => useEditorImageUpload(e));

      result.current(imageFile(), at);
      e.commands.insertContentAt(1, 'xx');
      e.commands.focus('end');
      resolveUpload(FILE);

      await vi.waitFor(() => expect(topLevelTexts(e)).toHaveLength(4));
      expect(topLevelTexts(e)).toEqual(['xxA', '[img]', 'B', 'C']);
      expect(offSpy).toHaveBeenCalledWith('transaction', expect.any(Function));
   });

   it('should remove the listener and insert nothing when the upload fails', async () => {
      const e = createEditor();
      mutateAsync.mockRejectedValue(new Error('fail'));
      const offSpy = vi.spyOn(e, 'off');
      const { result } = renderHook(() => useEditorImageUpload(e));

      result.current(imageFile(), 3);

      await vi.waitFor(() =>
         expect(offSpy).toHaveBeenCalledWith('transaction', expect.any(Function)),
      );
      expect(topLevelTexts(e)).toEqual(['A', 'B', 'C']);
   });

   it('should insert at the cursor without a position', async () => {
      const e = createEditor();
      mutateAsync.mockResolvedValue(FILE);
      e.commands.focus('end');
      const { result } = renderHook(() => useEditorImageUpload(e));

      result.current(imageFile());

      await vi.waitFor(() => expect(e.getHTML()).toContain('<img'));
      expect(topLevelTexts(e)).toEqual(['A', 'B', 'C', '[img]']);
   });
});
