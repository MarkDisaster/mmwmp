import { describe, expect, it } from 'vitest';

import csLocale from '../locales/cs.json';
import enLocale from '../locales/en.json';

const LOCALES = { cs: csLocale, en: enLocale };

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const PLACEHOLDER = /\{\{\s*([\w.]+)/g;

const flatten = (messages: object, prefix = ''): Record<string, string> =>
   Object.entries(messages).reduce<Record<string, string>>((flat, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === 'string'
         ? { ...flat, [path]: value }
         : { ...flat, ...flatten(value as object, path) };
   }, {});

const toBaseKey = (key: string) => key.replace(PLURAL_SUFFIX, '');

const getPlaceholdersByKey = (messages: Record<string, string>) => {
   const byKey = new Map<string, Set<string>>();
   for (const [key, value] of Object.entries(messages)) {
      const placeholders = byKey.get(toBaseKey(key)) ?? new Set<string>();
      for (const [, name] of value.matchAll(PLACEHOLDER)) placeholders.add(name);
      byKey.set(toBaseKey(key), placeholders);
   }
   return byKey;
};

const sortedKeys = (byKey: Map<string, Set<string>>) => [...byKey.keys()].sort();

describe('admin locales', () => {
   const cs = flatten(LOCALES.cs);
   const en = flatten(LOCALES.en);

   it('should have the same keys in Czech and English', () => {
      expect(sortedKeys(getPlaceholdersByKey(en))).toEqual(sortedKeys(getPlaceholdersByKey(cs)));
   });

   it('should use the same placeholders in both languages', () => {
      const csPlaceholders = getPlaceholdersByKey(cs);
      const differing = [...getPlaceholdersByKey(en)]
         .filter(([key, placeholders]) => {
            const other = csPlaceholders.get(key);
            return other && [...placeholders].sort().join() !== [...other].sort().join();
         })
         .map(([key]) => key);
      expect(differing).toEqual([]);
   });

   it.each(Object.keys(LOCALES) as (keyof typeof LOCALES)[])(
      'should give every plural key of %s exactly the forms of the language',
      (language) => {
         const messages = flatten(LOCALES[language]);
         const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories;
         const pluralKeys = new Set(
            Object.keys(messages)
               .filter((key) => PLURAL_SUFFIX.test(key))
               .map(toBaseKey),
         );
         for (const key of pluralKeys) {
            const forms = Object.keys(messages)
               .filter((candidate) => toBaseKey(candidate) === key && candidate !== key)
               .map((candidate) => candidate.slice(key.length + 1));
            expect(forms.sort(), key).toEqual([...categories].sort());
         }
      },
   );
});
