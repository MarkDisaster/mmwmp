import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import type { EditorView } from '@tiptap/pm/view';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { FileEntity } from '@/api/generated';
import { EditorToolbar } from '@/features/editor/components/EditorToolbar';
import { HtmlSourceDialog } from '@/features/editor/components/HtmlSourceDialog';
import type { LinkValue } from '@/features/editor/components/LinkDialog';
import { LinkDialog } from '@/features/editor/components/LinkDialog';
import { MarkdownPaste } from '@/features/editor/extensions/MarkdownPaste';
import { IMAGE_ACCEPT, useEditorImageUpload } from '@/features/editor/hooks/useEditorImageUpload';
import { blockInsertPosition } from '@/features/editor/utils/dropPosition';
import { imageContentFromFile, insertImageContent } from '@/features/editor/utils/imageContent';
import { isSanitizerAllowedUri } from '@/features/editor/utils/linkHref';
import { FilePickerDialog } from '@/features/files/components/FilePickerDialog';
import { isImageMimeType } from '@/utils/file';

type TextEditorProps = {
   content: string;
   onChange: (html: string) => void;
   placeholder?: string;
   labelledBy?: string;
   disabled?: boolean;
};

const dropInsertPosition = (view: EditorView, event: DragEvent) => {
   const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
   if (!coords) return undefined;
   const $pos = view.state.doc.resolve(coords.pos);
   const dom = $pos.depth > 0 ? view.nodeDOM($pos.before($pos.depth)) : null;
   const rect = dom instanceof Element ? dom.getBoundingClientRect() : null;
   return blockInsertPosition(view.state.doc, coords.pos, event.clientY, rect);
};

export const TextEditor = ({
   content,
   onChange,
   placeholder,
   labelledBy,
   disabled = false,
}: TextEditorProps) => {
   const [imagePickerOpen, setImagePickerOpen] = useState(false);
   const [htmlSourceOpen, setHtmlSourceOpen] = useState(false);
   const [linkDialogOpen, setLinkDialogOpen] = useState(false);
   const [linkInitialValue, setLinkInitialValue] = useState<LinkValue | null>(null);
   const syncedContent = useRef(content);

   const editor = useEditor({
      extensions: [
         StarterKit.configure({
            heading: false,
            link: {
               openOnClick: false,
               enableClickSelection: true,
               autolink: false,
               linkOnPaste: false,
               shouldAutoLink: () => false,
               isAllowedUri: (url, { defaultValidate }) =>
                  defaultValidate(url) && isSanitizerAllowedUri(url),
               HTMLAttributes: { target: null, rel: null },
            },
         }),
         Heading.configure({ levels: [2, 3] }),
         Image.configure({ inline: true }),
         TableKit.configure({ table: { resizable: false } }),
         Placeholder.configure({ placeholder: placeholder ?? '' }),
         Markdown.configure({ markedOptions: { breaks: true } }),
         MarkdownPaste,
      ],
      content,
      onUpdate: ({ editor }) => {
         syncedContent.current = editor.isEmpty ? '' : editor.getHTML();
         onChange(syncedContent.current);
      },
      editorProps: {
         attributes: {
            'aria-multiline': 'true',
            ...(labelledBy && { 'aria-labelledby': labelledBy }),
         },
         handleDrop: (view, event, _slice, moved) => {
            if (moved || !event.dataTransfer?.files.length) return false;
            const file = event.dataTransfer.files[0];
            if (!file || !isImageMimeType(file.type)) return false;
            event.preventDefault();
            handleImageUpload(file, dropInsertPosition(view, event));
            return true;
         },
         handlePaste: (view, event) => {
            const items = event.clipboardData?.items;
            if (!items) return false;
            for (const item of items) {
               if (isImageMimeType(item.type)) {
                  event.preventDefault();
                  const file = item.getAsFile();
                  if (file) handleImageUpload(file);
                  return true;
               }
            }
            return false;
         },
      },
   });

   useEffect(() => {
      if (!editor || content === syncedContent.current) return;
      syncedContent.current = content;
      editor.commands.setContent(content, { emitUpdate: false });
   }, [editor, content]);

   useEffect(() => {
      editor?.setEditable(!disabled, false);
   }, [editor, disabled]);

   const handleImageUpload = useEditorImageUpload(editor);

   const handleImageSelect = useCallback(
      (file: FileEntity) => {
         if (editor) insertImageContent(editor, imageContentFromFile(file));
         setImagePickerOpen(false);
      },
      [editor],
   );

   if (!editor) {
      return null;
   }

   const openLinkDialog = () => {
      const { href, target } = editor.getAttributes('link');
      setLinkInitialValue(href ? { href, newTab: target === '_blank' } : null);
      setLinkDialogOpen(true);
   };

   const closeLinkDialog = () => {
      setLinkDialogOpen(false);
      editor.commands.focus();
   };

   const applyLink = ({ href, newTab }: LinkValue) => {
      const applied = editor
         .chain()
         .extendMarkRange('link')
         .setLink({
            href,
            target: newTab ? '_blank' : null,
            rel: newTab ? 'noopener noreferrer' : null,
         })
         .run();
      if (applied) {
         editor.commands.focus();
         setLinkDialogOpen(false);
      }
      return applied;
   };

   const removeLink = () => {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkDialogOpen(false);
   };

   return (
      <>
         <div className="rounded-md border">
            <EditorToolbar
               editor={editor}
               onLinkClick={openLinkDialog}
               onImageClick={() => setImagePickerOpen(true)}
               onHtmlSourceClick={() => setHtmlSourceOpen(true)}
            />
            <EditorContent
               editor={editor}
               className="prose prose-sm max-w-none p-4 text-base focus:outline-none md:text-sm [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:focus:outline-none [&_a]:cursor-pointer [&_a]:font-semibold [&_a]:text-brand [&_a]:no-underline [&_a:hover]:underline"
            />
         </div>

         <LinkDialog
            open={linkDialogOpen}
            initialValue={linkInitialValue}
            onSubmit={applyLink}
            onRemove={removeLink}
            onClose={closeLinkDialog}
         />

         <HtmlSourceDialog
            open={htmlSourceOpen}
            html={htmlSourceOpen ? editor.getHTML() : ''}
            onClose={() => setHtmlSourceOpen(false)}
         />

         <FilePickerDialog
            open={imagePickerOpen}
            onSelect={handleImageSelect}
            onClose={() => setImagePickerOpen(false)}
            accept={IMAGE_ACCEPT}
         />
      </>
   );
};
