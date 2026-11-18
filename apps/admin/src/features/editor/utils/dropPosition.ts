import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export const blockInsertPosition = (
   doc: ProseMirrorNode,
   pos: number,
   clientY: number,
   blockRect: { top: number; height: number } | null,
): number => {
   const $pos = doc.resolve(pos);
   if ($pos.depth === 0) return pos;
   const before = $pos.before($pos.depth);
   const after = $pos.after($pos.depth);
   if (!blockRect) return after;
   return clientY < blockRect.top + blockRect.height / 2 ? before : after;
};
