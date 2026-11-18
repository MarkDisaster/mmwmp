import { describe, expect, it } from 'vitest';

import { redactUrl } from '../redactUrl';

describe('redactUrl', () => {
   it('should replace the token of an invitation and of a password reset', () => {
      expect(redactUrl('https://admin.marek.media/invitation/abc123')).toBe(
         'https://admin.marek.media/invitation/[token]',
      );
      expect(redactUrl('/reset-password/xyz?x=1')).toBe('/reset-password/[token]');
   });

   it('should drop the query and the fragment and keep any other path', () => {
      expect(redactUrl('/projects?search=jana#top')).toBe('/projects');
      expect(redactUrl('/projects/12/edit')).toBe('/projects/12/edit');
   });
});
