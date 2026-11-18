import 'reflect-metadata';

import { validate } from 'class-validator';

import { IsHttpUrl, isHttpUrl, MAX_URL_LENGTH } from '../is-http-url.decorator';

const ACCEPTED = [
   'https://example.com',
   'http://example.org/path?q=1#h',
   'HTTPS://EXAMPLE.COM',
   'https://example.com:8080/x',
   'https://sub.domain.example.co.uk/a/b',
   'https://xn--e1afmkfd.xn--p1ai',
   'https://пример.рф',
   'https://příklad.cz',
   'https://a_b.example.com',
   'https://example.com/ünï',
   'http://example.com/"><script>',
];

const REJECTED = [
   'https://localhost',
   'http://10.0.0.1',
   'https://127.0.0.1',
   'https://[::1]',
   'https://0x7f.0.0.1',
   'https://example.com.',
   'https://a.b',
   'https://example.com/ with space',
   'https://foo.com\n',
   ' https://foo.com',
   'https://ex\tample.com',
   'https://example.com\\@evil.com',
   'https://user:pass@example.com',
   'https://example.com/\u0007',
   'https://exa\u00admple.com',
   'https://exam\u200bple.com',
   'javascript:alert(1)',
   'data:text/html,x',
   'mailto:a@b.cz',
   'ftp://ftp.example.com',
   'example.com',
   '//example.com',
   'https:example.com',
   'https:///x',
   '',
   `https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`,
];

describe('isHttpUrl', () => {
   it.each(ACCEPTED)('should accept %s', (value) => {
      expect(isHttpUrl(value)).toBe(true);
   });

   it.each(REJECTED)('should reject %j', (value) => {
      expect(isHttpUrl(value)).toBe(false);
   });

   it.each([null, undefined, 42, {}, []])('should reject the non-string %j', (value) => {
      expect(isHttpUrl(value)).toBe(false);
   });
});

describe('@IsHttpUrl', () => {
   class Probe {
      @IsHttpUrl()
      url!: unknown;
   }

   const run = (url: unknown) => validate(Object.assign(new Probe(), { url }));

   it('should pass a valid URL', async () => {
      expect(await run('https://example.com')).toEqual([]);
   });

   it('should report the property with a readable message', async () => {
      const [error] = await run('javascript:alert(1)');

      expect(error.property).toBe('url');
      expect(Object.values(error.constraints ?? {})).toEqual([
         'url must be an absolute http(s) URL with a domain name',
      ]);
   });
});
