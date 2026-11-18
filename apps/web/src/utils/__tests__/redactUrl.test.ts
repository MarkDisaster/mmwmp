import { describe, expect, it } from 'vitest';

import { redactUrl } from '../redactUrl';

describe('redactUrl', () => {
   it('should drop the query with the draft secret and the fragment', () => {
      expect(redactUrl('https://marek.media/api/draft?secret=abc&slug=x#top')).toBe(
         'https://marek.media/api/draft',
      );
   });

   it('should keep an address without a query as it is', () => {
      expect(redactUrl('https://marek.media/projects/web')).toBe(
         'https://marek.media/projects/web',
      );
   });
});
