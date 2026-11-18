import { describe, expect, it } from 'vitest';

import { routing } from './routing';

describe('routing', () => {
   it('does not send the next-intl hreflang Link header', () => {
      expect((routing as { alternateLinks?: boolean }).alternateLinks).toBe(false);
   });
});
