import { extractUrls } from '../link-extractor';

describe('extractUrls', () => {
   it('finds href attributes, markdown links and bare URLs, once each', () => {
      const text = `
         <p>Viz <a href="https://a.example.com/x?y=1&amp;z=2">A</a> a <a href='http://b.example.com'>B</a>.</p>
         [C](https://c.example.com/path) [D](<https://d.example.com/>) https://e.example.com/end.
         Znovu https://a.example.com/x?y=1&z=2
      `;

      expect(extractUrls(text)).toEqual([
         'https://a.example.com/x?y=1&z=2',
         'http://b.example.com',
         'https://c.example.com/path',
         'https://d.example.com/',
         'https://e.example.com/end',
      ]);
   });

   it('ignores relative links, anchors, mail, phone and other schemes', () => {
      const text =
         '<a href="/projekty">p</a> <a href="#top">t</a> <a href="mailto:a@b.cz">m</a> ' +
         '<a href="tel:+420123">t</a> <a href="javascript:alert(1)">j</a> <a href="ftp://x.cz/f">f</a>';

      expect(extractUrls(text)).toEqual([]);
   });

   it('strips trailing punctuation and handles empty input', () => {
      expect(
         extractUrls('Podívej se na https://example.com/a, nebo https://example.org/b!'),
      ).toEqual(['https://example.com/a', 'https://example.org/b']);
      expect(extractUrls(null)).toEqual([]);
      expect(extractUrls(undefined)).toEqual([]);
      expect(extractUrls('')).toEqual([]);
   });

   it('returns an internal URL too: deciding what may be requested is the URL guard, not this', () => {
      expect(extractUrls('<a href="http://169.254.169.254/">x</a>')).toEqual([
         'http://169.254.169.254/',
      ]);
   });
});

describe('extractUrls — long runs of punctuation', () => {
   it('stays linear when a long run of punctuation is followed by another character', () => {
      const text = `https://example.com/a${'.'.repeat(100_000)}b`;
      const started = performance.now();
      const urls = extractUrls(text);
      expect(performance.now() - started).toBeLessThan(200);
      expect(urls).toHaveLength(1);
   });

   it('still removes trailing punctuation of any length', () => {
      expect(extractUrls('see https://example.com/page?!.,;:')).toEqual([
         'https://example.com/page',
      ]);
   });
});
