import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SOCIAL_PROFILE_URLS } from '../socialProfiles';

const llms = readFileSync(
   fileURLToPath(new URL('../../../public/llms.txt', import.meta.url)),
   'utf8',
);

describe('public/llms.txt', () => {
   it('links the profiles of SOCIAL_PROFILE_URLS and no other', () => {
      expect(llms).toContain(`[GitHub](${SOCIAL_PROFILE_URLS.github})`);
      expect(llms).toContain(`[LinkedIn](${SOCIAL_PROFILE_URLS.linkedin})`);
      expect(llms.match(/linkedin\.com\/\S+/g)).toHaveLength(1);
   });

   it('passes the checks of the Lighthouse llms.txt audit', () => {
      expect(llms).toMatch(/^\s*#\s+.+/m);
      expect(llms).toMatch(/\[.+\]\(.+\)/);
      expect(llms.length).toBeGreaterThanOrEqual(50);
   });

   it('follows the llmstxt.org structure', () => {
      const lines = llms.split('\n');
      expect(lines[0]).toMatch(/^# \S/);
      expect(lines.find((line) => line.trim() !== '' && !line.startsWith('# '))).toMatch(/^> /);

      const listItems = llms
         .split(/^## /m)
         .slice(1)
         .flatMap((section) => section.split('\n').filter((line) => line.startsWith('- ')));
      expect(listItems.length).toBeGreaterThan(0);
      for (const item of listItems) expect(item).toMatch(/^- \[[^\]]+\]\(https:\/\/[^)]+\)/);
   });
});
