import { Node, Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Extension } from '@tiptap/react';

import { clampHeadingLevels, looksLikeMarkdown } from '@/features/editor/utils/markdownPaste';

export const MarkdownPaste = Extension.create({
   name: 'markdownPaste',

   addProseMirrorPlugins() {
      const { editor } = this;
      return [
         new Plugin({
            key: new PluginKey('markdownPaste'),
            props: {
               clipboardTextParser: (text, _$context, plain) => {
                  const markdown = editor.markdown;
                  if (!markdown || plain || !looksLikeMarkdown(text))
                     return null as unknown as Slice;
                  try {
                     const parsed = clampHeadingLevels(markdown.parse(text));
                     const doc = Node.fromJSON(editor.schema, {
                        type: 'doc',
                        content: parsed.content,
                     });
                     return new Slice(doc.content, 0, 0);
                  } catch {
                     return null as unknown as Slice;
                  }
               },
            },
         }),
      ];
   },
});
