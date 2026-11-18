import type { JSONContent } from '@tiptap/react';

const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/m;
const HEADING = /^#{1,6} \S/m;
const BULLET = /^\s*[-*] \S/m;
const NUMBERED_LINE = /^\s*\d+\. \S/;
const BOLD = /\*\*[^*\s][^*\n]*\*\*/;

export const looksLikeMarkdown = (text: string): boolean => {
   const hasTable = text
      .split('\n')
      .some((line) => line.includes('|') && TABLE_SEPARATOR.test(line));
   const numberedLines = text.split('\n').filter((line) => NUMBERED_LINE.test(line)).length;
   return (
      hasTable || HEADING.test(text) || BULLET.test(text) || BOLD.test(text) || numberedLines >= 2
   );
};

export const clampHeadingLevels = (doc: JSONContent): JSONContent => {
   const mapped: JSONContent = { ...doc };
   if (doc.type === 'heading') {
      const level = Number(doc.attrs?.level);
      mapped.attrs = { ...doc.attrs, level: level <= 2 ? 2 : 3 };
   }
   if (doc.content) mapped.content = doc.content.map(clampHeadingLevels);
   return mapped;
};
