import { sanitizePlainText } from '../sanitize-plain-text';

describe('sanitizePlainText', () => {
   it('should keep plain text and trim it', () => {
      expect(sanitizePlainText('  Kdo jsem  ')).toBe('Kdo jsem');
   });

   it('should strip tags and drop the content of script tags', () => {
      expect(sanitizePlainText('<b>O</b> mně<script>alert(1)</script>')).toBe('O mně');
      expect(sanitizePlainText('<img src=x onerror=alert(1)>Ahoj')).toBe('Ahoj');
   });

   it('should keep ampersands and quotes readable', () => {
      expect(sanitizePlainText('Design & kód')).toBe('Design & kód');
   });

   it.each([null, undefined, '', '   ', '<p></p>'])('should turn %j into null', (value) => {
      expect(sanitizePlainText(value)).toBeNull();
   });
});
