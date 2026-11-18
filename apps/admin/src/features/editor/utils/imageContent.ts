import { NodeSelection } from '@tiptap/pm/state';
import type { Editor, JSONContent } from '@tiptap/react';

import type { FileEntity } from '@/api/generated';
import { getFileDisplayName, getMediumUrl } from '@/utils/file';

import { isSanitizerAllowedUri } from './linkHref';

export const imageContentFromFile = (file: FileEntity): JSONContent => ({
   type: 'paragraph',
   content: [
      {
         type: 'image',
         attrs: { src: getMediumUrl(file), alt: file.altText ?? getFileDisplayName(file) },
         ...(isSanitizerAllowedUri(file.publicUrl) && {
            marks: [
               {
                  type: 'link',
                  attrs: { href: file.publicUrl, target: '_blank', rel: 'noopener noreferrer' },
               },
            ],
         }),
      },
   ],
});

export const insertImageContent = (editor: Editor, content: JSONContent, at?: number) => {
   const { selection } = editor.state;
   const target = at ?? (selection instanceof NodeSelection ? selection.to : undefined);
   const chain = editor.chain().focus();
   if (target === undefined) chain.insertContent(content).run();
   else chain.insertContentAt(Math.min(target, editor.state.doc.content.size), content).run();
};
