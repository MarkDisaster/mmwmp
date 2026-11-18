import { z } from 'zod';

export const LOOKUP_CANDIDATE_LIMIT = 1000;

const LOOKUP_DEFAULT_LIMIT = 5;
const LOOKUP_MAX_LIMIT = 20;

const LOOKUP_QUERY_MAX_LENGTH = 100;

type LookupMatchKind = 'exact' | 'partial' | 'fuzzy';

export type LookupField = { label: string; value: string | null | undefined };

export type LookupMatch<T> = {
   item: T;
   match: LookupMatchKind;
   matchedOn: string;
   score: number;
};

const EXACT_SCORE = 1;
const PREFIX_SCORE = 0.95;
const CONTAINS_SCORE = 0.9;
const ALL_WORDS_SCORE = 0.85;
const FUZZY_WEIGHT = 0.8;
const FUZZY_THRESHOLD = 0.75;
const FUZZY_MIN_WORD_LENGTH = 4;
const MAX_WORD_LENGTH = 64;

export const normalizeForLookup = (value: string): string =>
   value
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();

const words = (normalised: string) =>
   normalised
      .split(' ')
      .filter(Boolean)
      .map((word) => word.slice(0, MAX_WORD_LENGTH));

const editDistance = (a: string, b: string): number => {
   const rows = a.length + 1;
   const cols = b.length + 1;
   const d: number[][] = Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
   );
   for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
         const cost = a[i - 1] === b[j - 1] ? 0 : 1;
         let best = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
         if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            best = Math.min(best, d[i - 2][j - 2] + 1);
         }
         d[i][j] = best;
      }
   }
   return d[a.length][b.length];
};

const wordSimilarity = (queryWord: string, valueWord: string): number => {
   if (valueWord === queryWord || valueWord.startsWith(queryWord)) return 1;
   if (queryWord.length < FUZZY_MIN_WORD_LENGTH) return 0;
   const target =
      valueWord.length > queryWord.length + 2
         ? valueWord.slice(0, queryWord.length + 1)
         : valueWord;
   return 1 - editDistance(queryWord, target) / Math.max(queryWord.length, target.length);
};

const scoreField = (query: string, queryWords: string[], value: string): number => {
   if (!value) return 0;
   if (value === query) return EXACT_SCORE;
   if (value.startsWith(query)) return PREFIX_SCORE;
   const compactQuery = query.replaceAll(' ', '');
   const compactValue = value.replaceAll(' ', '');
   if (compactValue === compactQuery) return EXACT_SCORE;
   if (value.includes(query) || compactValue.includes(compactQuery)) return CONTAINS_SCORE;

   const valueWords = words(value);
   const similarities = queryWords.map((queryWord) =>
      Math.max(0, ...valueWords.map((valueWord) => wordSimilarity(queryWord, valueWord))),
   );
   if (similarities.every((similarity) => similarity === 1)) return ALL_WORDS_SCORE;

   const average = similarities.reduce((sum, s) => sum + s, 0) / similarities.length;
   return average >= FUZZY_THRESHOLD ? FUZZY_WEIGHT * average : 0;
};

const matchKind = (score: number): LookupMatchKind =>
   score === EXACT_SCORE ? 'exact' : score >= ALL_WORDS_SCORE ? 'partial' : 'fuzzy';

export const rankLookupMatches = <T>(
   query: string,
   candidates: readonly T[],
   fieldsOf: (candidate: T) => LookupField[],
): LookupMatch<T>[] => {
   const normalisedQuery = normalizeForLookup(query);
   if (!normalisedQuery) return [];
   const queryWords = words(normalisedQuery);

   const matches: LookupMatch<T>[] = [];
   for (const item of candidates) {
      let best: { score: number; label: string } | null = null;
      for (const { label, value } of fieldsOf(item)) {
         if (!value) continue;
         const score = scoreField(normalisedQuery, queryWords, normalizeForLookup(value));
         if (score > 0 && (!best || score > best.score)) best = { score, label };
      }
      if (best) {
         matches.push({
            item,
            score: best.score,
            matchedOn: best.label,
            match: matchKind(best.score),
         });
      }
   }
   return matches.sort((a, b) => b.score - a.score);
};

const NO_MATCH_HINT =
   'No match. Retry with a shorter part of the name (one word), or browse with the list tool ' +
   'without a search before telling the user the record does not exist.';

export const lookupInputSchema = (queryDescription: string) =>
   z.object({
      query: z.string().trim().min(1).max(LOOKUP_QUERY_MAX_LENGTH).describe(queryDescription),
      limit: z
         .number()
         .int()
         .min(1)
         .max(LOOKUP_MAX_LIMIT)
         .optional()
         .describe(
            `Max matches to return (default ${LOOKUP_DEFAULT_LIMIT}, max ${LOOKUP_MAX_LIMIT}).`,
         ),
   });

export type LookupInput = z.infer<ReturnType<typeof lookupInputSchema>>;

export const runLookup = <T, R extends object>(
   { query, limit }: LookupInput,
   candidates: readonly T[],
   fieldsOf: (candidate: T) => LookupField[],
   toItem: (candidate: T) => R,
) => {
   const truncated = candidates.length > LOOKUP_CANDIDATE_LIMIT;
   const matches = rankLookupMatches(query, candidates.slice(0, LOOKUP_CANDIDATE_LIMIT), fieldsOf);
   const items = matches
      .slice(0, limit ?? LOOKUP_DEFAULT_LIMIT)
      .map(({ item, match, matchedOn }) => ({ ...toItem(item), match, matchedOn }));

   return {
      query,
      total: matches.length,
      items,
      ...(items.length === 0 && { hint: NO_MATCH_HINT }),
      ...(truncated && {
         warning: `Only the ${LOOKUP_CANDIDATE_LIMIT} most recently updated records were searched.`,
      }),
   };
};
