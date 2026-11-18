import { describe, expect, it } from 'vitest';

import { PREVIEW_PAIRS, summarizeFileRenames } from '../summarizeFileRenames';

const ALT = 'chat.approval.fileAlt';
const LANGUAGE = 'chat.approval.fileLanguage';

describe('summarizeFileRenames', () => {
   it('should count the files and list old → new names', () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
         id: i + 1,
         currentName: `screencapture-${i}.png`,
         displayName: `${i}.png`,
      }));

      const summary = summarizeFileRenames({ files });

      expect(summary?.count).toBe(10);
      expect(summary?.lines[0]).toEqual([
         {
            key: 'chat.approval.fileRename',
            params: { name: 'screencapture-0.png', value: '0.png' },
         },
      ]);
      expect(summary?.lines).toHaveLength(8);
      expect(summary?.more).toBe(2);
      expect(summary?.header).toBeNull();
   });

   it('should describe a language-only change as such, not as a rename', () => {
      const summary = summarizeFileRenames({
         files: [{ id: 1, currentName: 'a.png', language: 'cs' }],
      });

      expect(summary?.lines).toEqual([
         [{ key: LANGUAGE, params: { name: 'a.png', language: 'cs' } }],
      ]);
   });

   it('should show an alt text change in full, and a cleared one as empty', () => {
      const long = 'x'.repeat(300);
      const summary = summarizeFileRenames({
         files: [
            { id: 1, currentName: 'a.png', altText: 'Logo firmy' },
            { id: 2, currentName: 'b.png', altText: null },
            { id: 3, currentName: 'c.png', altText: long, language: 'cs' },
         ],
      });

      expect(summary?.lines).toEqual([
         [{ key: ALT, params: { name: 'a.png', alt: 'Logo firmy' } }],
         [{ key: ALT, params: { name: 'b.png', alt: null } }],
         [
            { key: LANGUAGE, params: { name: 'c.png', language: 'cs' } },
            { key: ALT, params: { name: 'c.png', alt: long } },
         ],
      ]);
   });

   it('should show the target status of a bulk status change', () => {
      const summary = summarizeFileRenames({
         projects: [{ id: 1, title: 'Nemocnice' }],
         status: 'published',
      });

      expect(summary?.header).toEqual({
         key: 'chat.approval.targetStatus',
         params: { status: 'published' },
      });
      expect(summary?.lines).toEqual([
         [{ key: 'chat.approval.projectTitle', params: { title: 'Nemocnice' } }],
      ]);
   });

   it('should show which tag is added or removed', () => {
      const summary = summarizeFileRenames({
         tagId: 5,
         tagName: 'React',
         projects: [{ id: 1, title: 'A' }],
      });

      expect(summary?.header).toEqual({
         key: 'chat.approval.tagLabel',
         params: { name: 'React', id: 5 },
      });
   });

   it('should show name and size of files to delete with the total size', () => {
      const summary = summarizeFileRenames({
         files: [
            { id: 1, name: 'a.png', sizeBytes: 1024 * 1024 },
            { id: 2, name: 'a.png', sizeBytes: 1024 * 1024 },
         ],
      });

      const line = [
         { key: 'chat.approval.fileDelete', params: { name: 'a.png', sizeBytes: 1024 * 1024 } },
      ];
      expect(summary?.lines).toEqual([line, line]);
      expect(summary?.header).toEqual({
         key: 'chat.approval.totalSize',
         params: { sizeBytes: 2 * 1024 * 1024 },
      });
   });

   it('should return null for the input of any other tool', () => {
      expect(summarizeFileRenames({ id: 4 })).toBeNull();
      expect(summarizeFileRenames(undefined)).toBeNull();
      expect(summarizeFileRenames({ files: [] })).toBeNull();
   });

   it('should list only the first items by default and every item with expandAll, alt texts uncut', () => {
      const files = Array.from({ length: 20 }, (_, i) => ({
         id: i + 1,
         currentName: `f${i}.png`,
         altText: `Popis ${i}: ${'y'.repeat(250)}`,
      }));

      const collapsed = summarizeFileRenames({ files });
      const all = summarizeFileRenames({ files }, { expandAll: true });

      expect(collapsed?.lines).toHaveLength(PREVIEW_PAIRS);
      expect(collapsed?.more).toBe(20 - PREVIEW_PAIRS);
      expect(all?.lines).toHaveLength(20);
      expect(all?.more).toBe(0);
      expect(all?.count).toBe(20);
      expect(all?.lines[19]).toEqual([
         {
            key: ALT,
            params: { name: 'f19.png', alt: `Popis 19: ${'y'.repeat(250)}` },
         },
      ]);
   });
});
