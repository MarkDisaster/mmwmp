import { createHash } from 'node:crypto';

import { RICH_TEXT_KEYS, summarizeKeys } from '../redact';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

describe('summarizeKeys', () => {
   const keys = new Set(RICH_TEXT_KEYS);

   it('stores the rich text of every translation as its length and hash', () => {
      const content = '<p>long text</p>';
      const body = {
         slug: 'web',
         translations: [
            { language: 'cs', title: 'Web', description: 'Popis', content },
            { language: 'en', title: 'Web', content: null },
         ],
      };

      expect(summarizeKeys(body, keys)).toEqual({
         slug: 'web',
         translations: [
            {
               language: 'cs',
               title: 'Web',
               description: { length: 5, sha256: sha256('Popis') },
               content: { length: content.length, sha256: sha256(content) },
            },
            { language: 'en', title: 'Web', content: null },
         ],
      });
   });

   it('leaves the body as it is without keys', () => {
      const body = { content: 'text' };
      expect(summarizeKeys(body, new Set())).toBe(body);
   });
});
