import { describe, expect, it } from 'vitest';

import { formatHtml } from '../utils/formatHtml';

const stripWhitespace = (value: string) => value.replace(/\s+/g, '');

describe('formatHtml', () => {
   it('should put each block tag on its own line and indent children by 3 spaces', () => {
      expect(formatHtml('<p>a</p><ul><li>b</li></ul>')).toBe(
         '<p>a</p>\n<ul>\n   <li>b</li>\n</ul>',
      );
   });

   it('should keep tr and td on separate indented lines in a table', () => {
      expect(
         formatHtml('<table><tbody><tr><th>h</th></tr><tr><td>x</td></tr></tbody></table>'),
      ).toBe(
         [
            '<table>',
            '   <tbody>',
            '      <tr>',
            '         <th>h</th>',
            '      </tr>',
            '      <tr>',
            '         <td>x</td>',
            '      </tr>',
            '   </tbody>',
            '</table>',
         ].join('\n'),
      );
   });

   it('should keep a paragraph inside a cell on one line', () => {
      expect(formatHtml('<table><tr><td><p>x</p></td></tr></table>')).toBe(
         '<table>\n   <tr>\n      <td>\n         <p>x</p>\n      </td>\n   </tr>\n</table>',
      );
   });

   it('should keep inline tags and text inside the line of their block', () => {
      expect(formatHtml('<p>a <strong>b</strong> <a href="/x?a=1&b=2">c</a><br>d</p>')).toBe(
         '<p>a <strong>b</strong> <a href="/x?a=1&b=2">c</a><br>d</p>',
      );
   });

   it('should treat a void block tag as one line', () => {
      expect(formatHtml('<table><colgroup><col><col></colgroup></table>')).toBe(
         '<table>\n   <colgroup>\n      <col>\n      <col>\n   </colgroup>\n</table>',
      );
   });

   it('should keep the content of pre untouched on one line', () => {
      const pre = '<pre><code>a\n  <p>b</p>\n</code></pre>';
      expect(formatHtml(`<blockquote>${pre}</blockquote>`)).toBe(
         `<blockquote>\n   ${pre}\n</blockquote>`,
      );
   });

   it('should return an empty string for an empty string', () => {
      expect(formatHtml('')).toBe('');
   });

   it('should only change whitespace between block tags', () => {
      const html = '<h2>T</h2><p>a <em>b</em></p><ol><li><p>c</p></li></ol>';
      expect(stripWhitespace(formatHtml(html))).toBe(stripWhitespace(html));
   });

   it.each([
      ['an unclosed tag', '<ul><li>a'],
      ['a stray closing tag', '</p>a</li>'],
      ['a stray <', 'a < b <p>c</p> <'],
      ['an unclosed attribute', '<p class="a>b</p>'],
      ['an unclosed pre', '<p>a</p><pre>b\n  c'],
      ['unbalanced nesting', '<ul><li>a</ul></li></p>'],
   ])('should not throw or lose characters on %s', (_name, html) => {
      const result = formatHtml(html);
      expect(stripWhitespace(result)).toBe(stripWhitespace(html));
   });
});
