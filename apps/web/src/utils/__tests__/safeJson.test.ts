import { describe, expect, it } from 'vitest';

import { safeJson } from '../safeJson';

const LINE_SEPARATOR = String.fromCharCode(0x2028);

describe('safeJson', () => {
   it('cannot close the script tag or open an HTML comment', () => {
      const name = `</script><script>alert(1)</script><!-- & ${LINE_SEPARATOR}`;
      const json = safeJson({ name });

      expect(json).not.toMatch(/[<>&]/);
      expect(json).not.toContain(LINE_SEPARATOR);
      expect(JSON.parse(json).name).toBe(name);
   });
});
