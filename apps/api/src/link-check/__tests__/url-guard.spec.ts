import { checkableUrl, MAX_URL_LENGTH } from '../url-guard';

const reason = (raw: string) => {
   const result = checkableUrl(raw);
   return result.ok ? null : result.reason;
};

describe('checkableUrl', () => {
   it.each([
      'https://example.com/',
      'http://example.com/path?q=1#x',
      'https://sub.example.co.uk:443/a',
      'http://example.com:80/',
      'https://8.8.8.8/',
      'https://[2606:4700:4700::1111]/',
      '  https://example.com/trim  ',
   ])('accepts %s', (raw) => {
      expect(checkableUrl(raw).ok).toBe(true);
   });

   it.each([
      'ftp://example.com/',
      'file:///etc/passwd',
      'gopher://example.com/',
      'javascript:alert(1)',
      'data:text/html,hi',
      'ws://example.com/',
      'dict://127.0.0.1:11211/',
      'mailto:a@example.com',
   ])('refuses the scheme of %s', (raw) => {
      expect(checkableUrl(raw).ok).toBe(false);
   });

   it.each([
      'https://user:pass@example.com/',
      'https://user@example.com/',
      'https://:pass@example.com/',
      'http://example.com@127.0.0.1/',
      'http://127.0.0.1#@example.com/',
   ])('does not request a URL with credentials or a userinfo trick: %s', (raw) => {
      expect(checkableUrl(raw).ok).toBe(false);
   });

   it('reads the backslash trick as the parser does: the host the request would use', () => {
      const result = checkableUrl('http://example.com\\@127.0.0.1/');
      if (result.ok) expect(result.url.hostname).toBe('example.com');
      else expect(result.ok).toBe(false);
   });

   it.each([
      ['http://127.0.0.1/', 'loopback'],
      ['http://127.0.0.1:8080/', 'loopback with a port'],
      ['http://localhost/', 'localhost'],
      ['http://localhost./', 'localhost with a trailing dot'],
      ['http://LOCALHOST/', 'localhost in capitals'],
      ['http://foo.localhost/', 'a subdomain of localhost'],
      ['http://[::1]/', 'IPv6 loopback'],
      ['http://[::]/', 'IPv6 unspecified'],
      ['http://0.0.0.0/', 'unspecified'],
      ['http://0/', 'zero as an IP'],
      ['http://169.254.169.254/latest/meta-data/', 'cloud metadata'],
      ['http://[fd00:ec2::254]/', 'AWS IPv6 metadata'],
      ['http://metadata.google.internal/', 'GCP metadata name'],
      ['http://10.0.0.1/', 'private 10/8'],
      ['http://172.16.0.1/', 'private 172.16/12'],
      ['http://192.168.0.1/', 'private 192.168/16'],
      ['http://100.64.0.1/', 'carrier-grade NAT'],
      ['http://[::ffff:127.0.0.1]/', 'IPv4-mapped loopback'],
      ['http://[::ffff:7f00:1]/', 'IPv4-mapped loopback, hex'],
      ['http://[::ffff:169.254.169.254]/', 'IPv4-mapped metadata'],
      ['http://[64:ff9b::7f00:1]/', 'NAT64 of loopback'],
      ['http://[fe80::1]/', 'IPv6 link-local'],
      ['http://printer.local/', 'mDNS name'],
      ['http://intranet/', 'a name without a dot'],
      ['http://db.internal/', 'internal suffix'],
      ['http://router.lan/', 'lan suffix'],
   ])('refuses %s (%s)', (raw) => {
      expect(checkableUrl(raw).ok).toBe(false);
   });

   it.each([
      ['http://2130706433/', 'decimal 127.0.0.1'],
      ['http://0x7f000001/', 'hex 127.0.0.1'],
      ['http://0x7f.0.0.1/', 'hex octet'],
      ['http://0177.0.0.1/', 'octal octet'],
      ['http://017700000001/', 'octal 127.0.0.1'],
      ['http://127.1/', 'short form'],
      ['http://127.0.1/', 'short form, three parts'],
      ['http://0x7f.1/', 'mixed'],
      ['http://2852039166/', 'decimal 169.254.169.254'],
      ['http://0xa9fea9fe/', 'hex 169.254.169.254'],
      ['http://0251.0376.0251.0376/', 'octal 169.254.169.254'],
      ['http://167772161/', 'decimal 10.0.0.1'],
      ['http://127.0.0.1./', 'dotted loopback with a trailing dot'],
      ['http://①②⑦.⓪.⓪.①/', 'full-width digits that IDNA maps to 127.0.0.1'],
      ['http://127。0。0。1/', 'ideographic full stops that the parser maps to dots'],
   ])('refuses the IP written as %s (%s) after the parser normalised it', (raw) => {
      expect(checkableUrl(raw).ok).toBe(false);
   });

   it.each([
      'http://example.com:22/',
      'http://example.com:25/',
      'http://example.com:6379/',
      'https://example.com:8443/',
      'http://example.com:8080/',
      'http://example.com:0/',
   ])('refuses a port that is not 80 / 443: %s', (raw) => {
      expect(reason(raw)).toMatch(/^Port/);
   });

   it('refuses what is not a URL, an empty host and an over-long URL', () => {
      expect(reason('not a url')).toBe('Not a valid absolute URL');
      expect(reason('/relative/path')).toBe('Not a valid absolute URL');
      expect(reason('//example.com/')).toBe('Not a valid absolute URL');
      expect(reason('http://')).toBe('Not a valid absolute URL');
      expect(reason(`https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`)).toBe('URL is too long');
   });

   it('returns the parsed URL the request has to be built from', () => {
      const result = checkableUrl('HTTPS://Example.COM:443/A b?q=1');

      expect(result.ok && result.url.href).toBe('https://example.com/A%20b?q=1');
   });
});
