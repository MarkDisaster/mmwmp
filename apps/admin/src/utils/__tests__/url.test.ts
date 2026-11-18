import { describe, expect, it } from 'vitest';

import { isHttpUrl, MAX_URL_LENGTH } from '../url';

describe('isHttpUrl', () => {
   it('should accept absolute http(s) URLs on a dotted domain name', () => {
      expect(isHttpUrl('https://example.com')).toBe(true);
      expect(isHttpUrl('http://example.com/path?q=1#top')).toBe(true);
      expect(isHttpUrl('https://www.sub.example.co.uk:8443/a/b')).toBe(true);
      expect(isHttpUrl('HTTPS://EXAMPLE.COM')).toBe(true);
   });

   it('should accept internationalised domain names', () => {
      expect(isHttpUrl('https://xn--bcher-kva.de')).toBe(true);
      expect(isHttpUrl('https://münchen.de')).toBe(true);
   });

   it('should reject other values and schemes', () => {
      expect(isHttpUrl(undefined)).toBe(false);
      expect(isHttpUrl(42)).toBe(false);
      expect(isHttpUrl('')).toBe(false);
      expect(isHttpUrl('example.com')).toBe(false);
      expect(isHttpUrl('ftp://example.com')).toBe(false);
      expect(isHttpUrl('javascript:alert(1)')).toBe(false);
   });

   it('should reject a URL without a real authority', () => {
      expect(isHttpUrl('https:example.com')).toBe(false);
      expect(isHttpUrl('https:///example.com')).toBe(false);
   });

   it('should reject hosts that are not a dotted domain name', () => {
      expect(isHttpUrl('https://localhost')).toBe(false);
      expect(isHttpUrl('https://192.168.0.1')).toBe(false);
      expect(isHttpUrl('https://[::1]')).toBe(false);
      expect(isHttpUrl('https://example.com.')).toBe(false);
      expect(isHttpUrl('https://example.123')).toBe(false);
      expect(isHttpUrl('https://-example.com')).toBe(false);
   });

   it('should reject credentials and characters the URL parser would rewrite', () => {
      expect(isHttpUrl('https://user:pass@example.com')).toBe(false);
      expect(isHttpUrl('https://exa mple.com')).toBe(false);
      expect(isHttpUrl('https://example.com/a\\b')).toBe(false);
      expect(isHttpUrl('https://example.com/­')).toBe(false);
      expect(isHttpUrl('https://example.com/​')).toBe(false);
   });

   it('should keep percent-encoded characters in the path', () => {
      expect(isHttpUrl('https://example.com/a%20b')).toBe(true);
   });

   it('should reject a URL longer than the API allows', () => {
      const base = 'https://example.com/';
      expect(isHttpUrl(base + 'a'.repeat(MAX_URL_LENGTH - base.length))).toBe(true);
      expect(isHttpUrl(base + 'a'.repeat(MAX_URL_LENGTH - base.length + 1))).toBe(false);
   });
});
