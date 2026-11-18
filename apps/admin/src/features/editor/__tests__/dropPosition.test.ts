import { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';

import { blockInsertPosition } from '../utils/dropPosition';

const schema = new Schema({
   nodes: {
      doc: { content: 'block+' },
      paragraph: { group: 'block', content: 'text*' },
      bulletList: { group: 'block', content: 'listItem+' },
      listItem: { content: 'paragraph+' },
      text: { group: 'inline' },
   },
});

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

const doc = ProseMirrorNode.fromJSON(schema, {
   type: 'doc',
   content: [
      p('first'),
      {
         type: 'bulletList',
         content: [{ type: 'listItem', content: [p('item')] }],
      },
   ],
});

const RECT = { top: 100, height: 40 };

describe('blockInsertPosition', () => {
   it('should return a position between top-level blocks unchanged', () => {
      expect(blockInsertPosition(doc, 0, 0, RECT)).toBe(0);
      expect(blockInsertPosition(doc, 7, 500, RECT)).toBe(7);
   });

   it('should return the start of the block when dropped in its upper half', () => {
      expect(blockInsertPosition(doc, 3, 110, RECT)).toBe(0);
   });

   it('should return the end of the block when dropped in its lower half', () => {
      expect(blockInsertPosition(doc, 3, 130, RECT)).toBe(7);
   });

   it('should return the end of the block without a rect', () => {
      expect(blockInsertPosition(doc, 3, 110, null)).toBe(7);
   });

   it('should stay inside the list item for a paragraph of a list', () => {
      const before = blockInsertPosition(doc, 11, 110, RECT);
      const after = blockInsertPosition(doc, 11, 130, RECT);
      expect(before).toBe(9);
      expect(after).toBe(15);
      expect(doc.resolve(before).parent.type.name).toBe('listItem');
      expect(doc.resolve(after).parent.type.name).toBe('listItem');
   });
});
