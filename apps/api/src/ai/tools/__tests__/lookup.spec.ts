import {
   LOOKUP_CANDIDATE_LIMIT,
   lookupInputSchema,
   normalizeForLookup,
   rankLookupMatches,
   runLookup,
} from '../lookup';

type Project = { id: number; title: string; slug: string };

const PROJECTS: Project[] = [
   { id: 1, title: 'Selltoro', slug: 'selltoro' },
   { id: 2, title: 'Nemocnice Jindřichův Hradec', slug: 'nemocnice-jh' },
   { id: 3, title: 'Vinisto.cz', slug: 'vinisto' },
   { id: 4, title: 'Selltoro Ads', slug: 'selltoro-ads' },
];

const fields = (p: Project) => [
   { label: 'title', value: p.title },
   { label: 'slug', value: p.slug },
];

const rank = (query: string) =>
   rankLookupMatches(query, PROJECTS, fields).map(({ item, match }) => [item.id, match]);

describe('normalizeForLookup', () => {
   it('drops case, diacritics and punctuation', () => {
      expect(normalizeForLookup('  Nemocnice Jindřichův-Hradec! ')).toBe(
         'nemocnice jindrichuv hradec',
      );
      expect(normalizeForLookup('ŽLUŤOUČKÝ kůň')).toBe('zlutoucky kun');
   });
});

describe('rankLookupMatches', () => {
   it('ranks the exact name above the longer names that start with it', () => {
      expect(rank('selltoro')).toEqual([
         [1, 'exact'],
         [4, 'partial'],
      ]);
   });

   it('ignores case and diacritics', () => {
      expect(rank('SELLTORO')[0]).toEqual([1, 'exact']);
      expect(rank('jindrichuv')).toEqual([[2, 'partial']]);
      expect(rank('Jindřichův')).toEqual([[2, 'partial']]);
   });

   it('matches the words of the query in any order', () => {
      expect(rank('hradec nemocnice')).toEqual([[2, 'partial']]);
   });

   it('tolerates a typo: a missing letter, a doubled one, swapped neighbours', () => {
      expect(rank('seltoro')[0]).toEqual([1, 'fuzzy']);
      expect(rank('selltorro')[0]).toEqual([1, 'fuzzy']);
      expect(rank('nemocncie')).toEqual([[2, 'fuzzy']]);
   });

   it('treats separators and spaces alike ("sell toro" is "selltoro")', () => {
      expect(rank('sell toro')[0]).toEqual([1, 'exact']);
      expect(rank('nemocnice-jh')[0]).toEqual([2, 'exact']);
   });

   it('finds nothing for an unrelated or empty query', () => {
      expect(rank('pinta books')).toEqual([]);
      expect(rank('xy')).toEqual([]);
      expect(rank(' -- ')).toEqual([]);
   });

   it('reports the field that matched best', () => {
      const [match] = rankLookupMatches('vinisto', PROJECTS, fields);
      expect(match).toMatchObject({ matchedOn: 'slug', match: 'exact' });
   });
});

describe('runLookup', () => {
   const toItem = (p: Project) => ({ id: p.id, title: p.title });

   it('returns the best matches up to the limit and how many matched', () => {
      const result = runLookup({ query: 'selltoro', limit: 1 }, PROJECTS, fields, toItem);

      expect(result).toEqual({
         query: 'selltoro',
         total: 2,
         items: [{ id: 1, title: 'Selltoro', match: 'exact', matchedOn: 'title' }],
      });
   });

   it('tells the model what to try when nothing matched', () => {
      const result = runLookup({ query: 'pinta' }, PROJECTS, fields, toItem);

      expect(result.items).toEqual([]);
      expect(result).toHaveProperty('hint', expect.stringMatching(/shorter part of the name/));
   });

   it('warns when the table has more rows than were searched', () => {
      const many = Array.from({ length: LOOKUP_CANDIDATE_LIMIT + 1 }, (_, i) => ({
         id: i + 1,
         title: `Project ${i + 1}`,
         slug: `project-${i + 1}`,
      }));

      const result = runLookup({ query: 'project 1' }, many, fields, toItem);

      expect(result).toHaveProperty('warning', expect.stringMatching(/most recently updated/));
      expect(result.items[0]).toMatchObject({ id: 1, match: 'exact' });
   });
});

describe('lookupInputSchema', () => {
   const schema = lookupInputSchema('name');

   it('trims the query and rejects an empty or overlong one', () => {
      expect(schema.parse({ query: '  selltoro ' })).toEqual({ query: 'selltoro' });
      expect(schema.safeParse({ query: '   ' }).success).toBe(false);
      expect(schema.safeParse({ query: 'x'.repeat(101) }).success).toBe(false);
      expect(schema.safeParse({ query: 'a', limit: 21 }).success).toBe(false);
   });
});
