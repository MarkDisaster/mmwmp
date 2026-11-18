import i18next, { type TFunction } from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import { I18n } from '@/i18n/I18n';

import {
   describeBulkHeader,
   describeBulkLine,
   describeBulkSummary,
   describeToolInput,
} from '../describeToolInput';
import { summarizeFileRenames } from '../summarizeFileRenames';

const MB = 1024 * 1024;

let cs: TFunction;
let en: TFunction;

beforeAll(async () => {
   const i18n = i18next.createInstance();
   await i18n.init({
      lng: 'cs',
      resources: I18n.RESOURCES,
      interpolation: { escapeValue: false },
   });
   cs = i18n.getFixedT('cs');
   en = i18n.getFixedT('en');
});

const linesOf = (input: unknown, t: TFunction, locale: string) =>
   summarizeFileRenames(input)?.lines.map((line) => describeBulkLine(line, t, locale));

describe('describeBulkLine', () => {
   const files = {
      files: [
         { id: 1, currentName: 'a.png', displayName: 'b.png' },
         { id: 2, currentName: 'c.png', displayName: null },
         { id: 3, currentName: 'd.png', language: 'cs', altText: 'Logo firmy' },
         { id: 4, currentName: 'e.png', language: null, altText: '  ' },
      ],
   };

   it('should word the changes of a file in Czech, the language by its name', () => {
      expect(linesOf(files, cs, 'cs')).toEqual([
         'a.png → b.png',
         'c.png → ∅',
         'd.png: jazyk → Čeština; d.png: popis obrázku (alt) → "Logo firmy"',
         'e.png: jazyk → ∅; e.png: popis obrázku (alt) → ∅',
      ]);
   });

   it('should word the same changes in English', () => {
      expect(linesOf(files, en, 'en')).toEqual([
         'a.png → b.png',
         'c.png → ∅',
         'd.png: language → Czech; d.png: alt → "Logo firmy"',
         'e.png: language → ∅; e.png: alt → ∅',
      ]);
   });

   it('should write the size of a file to delete as the rest of the admin does', () => {
      const input = {
         files: [
            { id: 1, name: 'a.pdf', sizeBytes: 1.5 * MB },
            { id: 2, name: 'b.txt', sizeBytes: 500 },
         ],
      };

      expect(linesOf(input, cs, 'cs')).toEqual(['a.pdf (1,5 MB)', 'b.txt (500 B)']);
      expect(linesOf(input, en, 'en')).toEqual(['a.pdf (1.5 MB)', 'b.txt (500 B)']);
   });

   it('should show a project by its title', () => {
      expect(linesOf({ projects: [{ id: 1, title: 'Nemocnice' }] }, cs, 'cs')).toEqual([
         'Nemocnice',
      ]);
   });
});

describe('describeBulkHeader', () => {
   it('should write the total size with the decimal separator of the language', () => {
      const header = { key: 'chat.approval.totalSize', params: { sizeBytes: 3 * MB } } as const;

      expect(describeBulkHeader(header, cs, 'cs')).toBe('Celková velikost: 3 MB');
      expect(
         describeBulkHeader(
            { key: 'chat.approval.totalSize', params: { sizeBytes: 2.5 * MB } },
            cs,
            'cs',
         ),
      ).toBe('Celková velikost: 2,5 MB');
   });

   it('should name the target status in words', () => {
      expect(
         describeBulkHeader(
            { key: 'chat.approval.targetStatus', params: { status: 'published' } },
            cs,
            'cs',
         ),
      ).toBe('Cílový stav: publikováno');
   });

   it('should name the tag with its id', () => {
      expect(
         describeBulkHeader(
            { key: 'chat.approval.tagLabel', params: { name: 'React', id: 5 } },
            en,
            'en',
         ),
      ).toBe('Tag: React (id 5)');
   });
});

describe('describeBulkSummary', () => {
   it('should join the listed items into one line and add how many more there are', () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
         id: i + 1,
         currentName: `f${i}.png`,
         language: 'en',
      }));
      const summary = summarizeFileRenames({ files });

      if (!summary) throw new Error('expected a bulk summary');
      const text = describeBulkSummary(summary, cs, 'cs');

      expect(text.startsWith('f0.png: jazyk → Angličtina; f1.png: jazyk → Angličtina')).toBe(true);
      expect(text.endsWith('f7.png: jazyk → Angličtina (+2)')).toBe(true);
   });
});

describe('describeToolInput', () => {
   it('should prefer the wording a tile passes in and fall back to the raw input', () => {
      expect(describeToolInput({ id: 4 }, ['Štítek id 4'])).toBe('Štítek id 4');
      expect(describeToolInput({ id: 4 })).toBe('4');
      expect(describeToolInput(undefined, ['x'])).toBeNull();
   });
});
