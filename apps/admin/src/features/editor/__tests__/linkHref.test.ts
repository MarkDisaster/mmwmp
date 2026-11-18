import { describe, expect, it } from 'vitest';

import {
   isInternalHref,
   isParsableHref,
   isRelativeHref,
   isSanitizerAllowedUri,
   normalizeHref,
} from '../utils/linkHref';

const HTTPS_URL = 'https://example.com';
const MAILTO = 'mailto:a@b.cz';
const TEL = 'tel:+420777123456';

describe('isSanitizerAllowedUri', () => {
   it('should allow the schemes the API sanitizer keeps and hrefs without a scheme', () => {
      expect(isSanitizerAllowedUri(HTTPS_URL)).toBe(true);
      expect(isSanitizerAllowedUri('HTTP://example.com')).toBe(true);
      expect(isSanitizerAllowedUri(MAILTO)).toBe(true);
      expect(isSanitizerAllowedUri(TEL)).toBe(true);
      expect(isSanitizerAllowedUri('/projects')).toBe(true);
   });

   it('should refuse other schemes', () => {
      expect(isSanitizerAllowedUri('javascript:alert(1)')).toBe(false);
      expect(isSanitizerAllowedUri(' ftp://example.com')).toBe(false);
      expect(isSanitizerAllowedUri('data:text/html,x')).toBe(false);
   });
});

describe('isRelativeHref', () => {
   it('should match paths, anchors and queries of the same site', () => {
      for (const href of ['/projects', '#contact', './page', '../page', '?q=1']) {
         expect(isRelativeHref(href)).toBe(true);
      }
   });

   it('should not match hrefs that browsers resolve to another site', () => {
      for (const href of ['//evil.com/x', '/\\evil.com', 'example.com', 'https://a.cz']) {
         expect(isRelativeHref(href)).toBe(false);
      }
   });
});

describe('isInternalHref', () => {
   it('should treat relative hrefs and the site domains as internal', () => {
      expect(isInternalHref('/projects')).toBe(true);
      expect(isInternalHref('https://marek.media/projects')).toBe(true);
      expect(isInternalHref('https://www.marek.media')).toBe(true);
   });

   it('should treat other domains and unparsable hrefs as external', () => {
      expect(isInternalHref(HTTPS_URL)).toBe(false);
      expect(isInternalHref('https://marek.media.evil.com')).toBe(false);
      expect(isInternalHref('not a url')).toBe(false);
   });
});

describe('normalizeHref', () => {
   it('should trim and keep empty, relative and protocol-relative hrefs', () => {
      expect(normalizeHref('  ')).toBe('');
      expect(normalizeHref(' /projects ')).toBe('/projects');
      expect(normalizeHref('//cdn.example.com/x')).toBe('//cdn.example.com/x');
   });

   it('should keep hrefs that already have a scheme', () => {
      expect(normalizeHref(HTTPS_URL)).toBe(HTTPS_URL);
      expect(normalizeHref(MAILTO)).toBe(MAILTO);
      expect(normalizeHref(TEL)).toBe(TEL);
   });

   it('should add https to a domain, also with a port', () => {
      expect(normalizeHref('marek.media')).toBe('https://marek.media');
      expect(normalizeHref('localhost:3000')).toBe('https://localhost:3000');
      expect(normalizeHref('example.com:8080/x')).toBe('https://example.com:8080/x');
   });

   it('should turn an e-mail address into a mailto link', () => {
      expect(normalizeHref('hello@marek.media')).toBe('mailto:hello@marek.media');
   });
});

describe('isParsableHref', () => {
   it('should accept valid http URLs and anything that is not http', () => {
      expect(isParsableHref('https://example.com/a?b=c')).toBe(true);
      expect(isParsableHref('/projects')).toBe(true);
      expect(isParsableHref(MAILTO)).toBe(true);
   });

   it('should refuse text that became a broken http URL', () => {
      expect(isParsableHref('https://+420 777 123 456')).toBe(false);
   });
});
