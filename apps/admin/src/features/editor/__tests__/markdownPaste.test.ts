import type { JSONContent } from '@tiptap/react';
import { describe, expect, it } from 'vitest';

import { clampHeadingLevels, looksLikeMarkdown } from '../utils/markdownPaste';

describe('looksLikeMarkdown', () => {
   it.each([
      ['a pipe table', '| A | B |\n|---|---|\n| 1 | 2 |'],
      ['a table separator with alignment', 'A | B\n:--- | ---:\n1 | 2'],
      ['a heading', '## Title'],
      ['a heading in the middle', 'Intro\n\n### Part'],
      ['a dash list', '- item'],
      ['an asterisk list', '* item'],
      ['a numbered list', '1. a\n2. b'],
      ['a numbered line next to a heading', '1. a\n\n## Title'],
      ['a bold span', 'Some **bold** words'],
   ])('should accept %s', (_name, text) => {
      expect(looksLikeMarkdown(text)).toBe(true);
   });

   it.each([
      ['a sentence with a comma', 'Plain sentence, with a comma.'],
      ['a single pipe inside a sentence', 'Use a | b to choose one.'],
      ['a URL', 'https://example.com/a-b/c--d?x=1#top'],
      ['a path', '/home/user/some-folder/file-name.md'],
      ['a lone asterisk', 'Price * quantity is the total'],
      ['a hyphen inside a word', 'A well-known e-mail rule'],
      ['a Czech date', '16. listopadu proběhla konference.'],
      ['a Czech ordinal', '3. díl'],
      ['a single numbered line', '1. Introduction'],
      ['a hash without a space', '#hashtag and C#'],
   ])('should reject %s', (_name, text) => {
      expect(looksLikeMarkdown(text)).toBe(false);
   });
});

const heading = (level: number): JSONContent => ({
   type: 'heading',
   attrs: { level },
   content: [{ type: 'text', text: 'A' }],
});

describe('clampHeadingLevels', () => {
   it.each([
      [1, 2],
      [2, 2],
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
   ])('should map level %i to %i', (from, to) => {
      const result = clampHeadingLevels({ type: 'doc', content: [heading(from)] });
      expect(result.content?.[0]?.attrs?.level).toBe(to);
   });

   it('should reach nested headings and leave other nodes untouched', () => {
      const doc: JSONContent = {
         type: 'doc',
         content: [
            { type: 'blockquote', content: [heading(1)] },
            { type: 'paragraph', content: [{ type: 'text', text: 'x' }] },
         ],
      };
      const result = clampHeadingLevels(doc);
      expect(result.content?.[0]?.content?.[0]?.attrs?.level).toBe(2);
      expect(result.content?.[1]).toEqual(doc.content?.[1]);
   });

   it('should not mutate its input', () => {
      const doc: JSONContent = { type: 'doc', content: [heading(1)] };
      clampHeadingLevels(doc);
      expect(doc.content?.[0]?.attrs?.level).toBe(1);
   });
});
