import { describe, expect, it } from 'vitest';

import { formatProjectLinkLabel } from '../utils/formatProjectLinkLabel';

describe('formatProjectLinkLabel', () => {
   it('should prefer the label', () => {
      expect(formatProjectLinkLabel({ label: 'GitHub', url: 'https://github.com/x/y' })).toBe(
         'GitHub',
      );
   });

   it('should fall back to the domain without www', () => {
      expect(formatProjectLinkLabel({ label: null, url: 'https://www.example.com/a?b=1' })).toBe(
         'example.com',
      );
   });

   it('should keep subdomains', () => {
      expect(formatProjectLinkLabel({ label: null, url: 'https://storybook.example.com' })).toBe(
         'storybook.example.com',
      );
   });

   it('should return the raw value for an unparsable URL', () => {
      expect(formatProjectLinkLabel({ label: null, url: 'not a url' })).toBe('not a url');
   });
});
