import { ALLOWED_TAGS, RICH_TEXT_HTML_HINT, sanitizeRichText } from '../sanitize-rich-text';

describe('sanitizeRichText', () => {
   it('should keep a table with a header row and its cells', () => {
      const html =
         '<table><thead><tr><th colspan="2">A</th></tr></thead><tbody><tr><td rowspan="2">1</td><td>2</td></tr></tbody></table>';
      expect(sanitizeRichText(html)).toBe(html);
   });

   it('should keep a table that has no thead', () => {
      const html = '<table><tbody><tr><th>A</th></tr><tr><td>1</td></tr></tbody></table>';
      expect(sanitizeRichText(html)).toBe(html);
   });

   it('should drop style, class, id and event handlers from a cell', () => {
      const html =
         '<table><tbody><tr><td style="x" class="y" id="z" onclick="a()">1</td></tr></tbody></table>';
      expect(sanitizeRichText(html)).toBe('<table><tbody><tr><td>1</td></tr></tbody></table>');
   });

   it('should drop a script inside a cell with its content', () => {
      const result = sanitizeRichText(
         '<table><tbody><tr><td>1<script>alert(1)</script></td></tr></tbody></table>',
      );
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
   });

   it('should keep an image inside a link and force rel', () => {
      expect(
         sanitizeRichText(
            '<a href="https://x.test/a.jpg" target="_blank"><img src="https://x.test/m.webp" alt="A"></a>',
         ),
      ).toBe(
         '<a href="https://x.test/a.jpg" target="_blank" rel="noopener noreferrer"><img src="https://x.test/m.webp" alt="A" /></a>',
      );
   });

   it('should drop a target that is not _blank', () => {
      expect(sanitizeRichText('<a href="https://x.test" target="_top">x</a>')).toBe(
         '<a href="https://x.test" rel="noopener noreferrer">x</a>',
      );
   });

   it('should drop a javascript href on an image link', () => {
      const result = sanitizeRichText(
         '<a href="javascript:alert(1)"><img src="https://x.test/m.webp"></a>',
      );
      expect(result).not.toContain('javascript:');
      expect(result).toContain('<img src="https://x.test/m.webp" />');
   });

   it('should not accept a data href on a link but keep a data image src', () => {
      expect(sanitizeRichText('<a href="data:text/html,x">l</a>')).not.toContain('href');
      expect(sanitizeRichText('<img src="data:image/png;base64,AA==">')).toContain(
         'src="data:image/png;base64,AA=="',
      );
   });
});

describe('sanitizeRichText links and table structure', () => {
   it('should overwrite an author-supplied rel', () => {
      expect(sanitizeRichText('<a href="https://x.test" rel="opener">x</a>')).toBe(
         '<a href="https://x.test" rel="noopener noreferrer">x</a>',
      );
   });

   it('should drop target variants that are not exactly _blank', () => {
      expect(sanitizeRichText('<a href="https://x.test" target="_BLANK">x</a>')).not.toContain(
         'target',
      );
      expect(sanitizeRichText('<a href="https://x.test" target=" _blank">x</a>')).not.toContain(
         'target',
      );
   });

   it('should keep colgroup, col span and tfoot', () => {
      const html =
         '<table><colgroup><col span="2" /></colgroup><tbody><tr><td>1</td></tr></tbody><tfoot><tr><td>2</td></tr></tfoot></table>';
      expect(sanitizeRichText(html)).toBe(html);
   });
});

describe('sanitizeRichText cell spans', () => {
   const cell = (attrs: string) =>
      sanitizeRichText(`<table><tbody><tr><td ${attrs}>1</td></tr></tbody></table>`);
   const header = (attrs: string) =>
      sanitizeRichText(`<table><tbody><tr><th ${attrs}>A</th></tr></tbody></table>`);

   it('should keep a plain span', () => {
      expect(cell('colspan="2" rowspan="3"')).toContain('<td colspan="2" rowspan="3">');
      expect(header('colspan="2"')).toContain('<th colspan="2">');
   });

   it.each(['colspan="99999"', 'colspan="x"', 'colspan="0"', 'colspan="-1"', 'colspan="2.5"'])(
      'should drop %s',
      (attr) => {
         expect(cell(attr)).toContain('<td>1</td>');
         expect(header(attr)).toContain('<th>A</th>');
      },
   );

   it.each(['rowspan="-1"', 'rowspan="0"', 'rowspan="99999"', 'rowspan=" 2"'])(
      'should drop %s',
      (attr) => {
         expect(cell(attr)).toContain('<td>1</td>');
      },
   );

   it('should clamp a colspan above the HTML limit of 1000', () => {
      expect(cell('colspan="1001"')).toContain('<td colspan="1000">');
      expect(cell('colspan="9999"')).toContain('<td colspan="1000">');
   });

   it('should keep a rowspan of four digits as it is', () => {
      expect(cell('rowspan="9999"')).toContain('<td rowspan="9999">');
   });

   it('should still drop the other attributes of a cell', () => {
      expect(cell('colspan="2" style="x" onclick="a()"')).toContain('<td colspan="2">');
   });
});

describe('RICH_TEXT_HTML_HINT', () => {
   it('should name every allowed tag', () => {
      for (const tag of ALLOWED_TAGS) {
         expect(RICH_TEXT_HTML_HINT).toContain(`<${tag}>`);
      }
   });

   it('should tell that a table needs a header row', () => {
      expect(RICH_TEXT_HTML_HINT).toContain('thead');
      expect(RICH_TEXT_HTML_HINT).toContain('th');
      expect(RICH_TEXT_HTML_HINT).toContain('tbody');
   });

   it('should tell to write h2 and h3 headings only and no table caption', () => {
      expect(RICH_TEXT_HTML_HINT).toContain('Use <h2> and <h3> for headings');
      expect(RICH_TEXT_HTML_HINT).toContain('the page title is the <h1>');
      expect(RICH_TEXT_HTML_HINT).toContain('a table has no <caption>');
   });
});
