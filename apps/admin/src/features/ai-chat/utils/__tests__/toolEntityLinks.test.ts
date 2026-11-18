import { describe, expect, it } from 'vitest';

import { extractToolEntityLinks, MAX_TOOL_ENTITY_LINKS } from '../toolEntityLinks';

const ORIGIN = 'https://admin.marek.media';
const SELLTORO_URL = '/projects/12';

describe('extractToolEntityLinks', () => {
   it('should link every record a find tool returned', () => {
      const output = {
         query: 'selltoro',
         items: [
            { id: 12, title: 'Selltoro', adminUrl: SELLTORO_URL },
            { id: 13, title: 'Selltoro Ads', adminUrl: '/projects/13' },
         ],
      };

      expect(extractToolEntityLinks(output, ORIGIN)).toEqual([
         {
            label: 'Selltoro',
            href: SELLTORO_URL,
            target: { kind: 'entity', entity: 'project', id: 12 },
         },
         {
            label: 'Selltoro Ads',
            href: '/projects/13',
            target: { kind: 'entity', entity: 'project', id: 13 },
         },
      ]);
   });

   it('should link a detail and the records it names', () => {
      const output = {
         id: 3,
         title: 'Web',
         adminUrl: '/services/3',
         projects: [{ id: 12, slug: 'selltoro', adminUrl: SELLTORO_URL }],
      };

      expect(
         extractToolEntityLinks(output, ORIGIN).map(({ label, href }) => [label, href]),
      ).toEqual([
         ['Web', '/services/3'],
         ['selltoro', SELLTORO_URL],
      ]);
   });

   it('should label a user by name and link the filtered list', () => {
      const output = { items: [{ id: 5, name: 'Jan Novák', adminUrl: '/users?search=jan' }] };

      expect(extractToolEntityLinks(output, ORIGIN)).toMatchObject([
         { label: 'Jan Novák', target: { kind: 'page', route: '/users', search: 'jan' } },
      ]);
   });

   it('should drop a URL outside the admin whitelist and results without links', () => {
      expect(
         extractToolEntityLinks(
            { items: [{ title: 'x', adminUrl: 'https://evil.example/' }, { title: 'y' }] },
            ORIGIN,
         ),
      ).toEqual([]);
      expect(extractToolEntityLinks('done', ORIGIN)).toEqual([]);
      expect(extractToolEntityLinks(null, ORIGIN)).toEqual([]);
   });

   it('should show at most a few links', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({
         title: `P${i + 1}`,
         adminUrl: `/projects/${i + 1}`,
      }));

      expect(extractToolEntityLinks({ items }, ORIGIN)).toHaveLength(MAX_TOOL_ENTITY_LINKS);
   });
});
