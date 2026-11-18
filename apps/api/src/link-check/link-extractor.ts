const HREF = /\bhref\s*=\s*["']([^"']+)["']/gi;
const MARKDOWN_LINK = /\]\(\s*<?(https?:\/\/[^)\s>]+)/gi;
const BARE_URL = /https?:\/\/[^\s<>"'`)\]]+/gi;
const TRAILING_PUNCTUATION = '.,;:!?';

const stripTrailingPunctuation = (value: string): string => {
   let end = value.length;
   while (end > 0 && TRAILING_PUNCTUATION.includes(value[end - 1])) end--;
   return value.slice(0, end);
};

const clean = (raw: string): string =>
   stripTrailingPunctuation(raw.replaceAll('&amp;', '&')).trim();

export const extractUrls = (text: string | null | undefined): string[] => {
   if (!text) return [];
   const found = [
      ...[...text.matchAll(HREF)].map(([, url]) => url),
      ...[...text.matchAll(MARKDOWN_LINK)].map(([, url]) => url),
      ...[...text.matchAll(BARE_URL)].map(([url]) => url),
   ]
      .map((url) => clean(url ?? ''))
      .filter((url) => /^https?:\/\//i.test(url));
   return [...new Set(found)];
};
