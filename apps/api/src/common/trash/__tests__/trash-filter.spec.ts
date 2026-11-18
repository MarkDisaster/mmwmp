import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(__dirname, '..', '..', '..');

const TABLES = ['project', 'service', 'tag', 'file'];
const READ_CALL = new RegExp(
   `\\.(${[...TABLES, 'projectTag', 'serviceProject', 'projectMedia'].join('|')})\\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|aggregate|groupBy)\\(`,
);
const FILTER = /NOT_TRASHED|IN_TRASH|deletedAt|trash-ok/;
const RAW_FROM = /\b(?:FROM|JOIN)\s+(projects|services|tags|files)\b/i;
const RAW_FILTER = /deleted_at|trashCondition|trash-ok/;

const sourceFiles = (dir: string): string[] =>
   readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
         return ['__tests__', 'generated'].includes(name) ? [] : sourceFiles(path);
      }
      return name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [path] : [];
   });

const callBody = (text: string, open: number) => {
   let depth = 0;
   for (let i = open; i < text.length; i++) {
      if (text[i] === '(') depth++;
      if (text[i] === ')' && --depth === 0) return text.slice(open, i + 1);
   }
   return text.slice(open);
};

describe('trash filter', () => {
   const files = sourceFiles(SRC).map((path) => ({
      name: relative(SRC, path),
      text: readFileSync(path, 'utf8'),
   }));

   it('finds the source files and the reads it is meant to check', () => {
      expect(files.length).toBeGreaterThan(100);
      const reads = files.flatMap(({ text }) => text.match(new RegExp(READ_CALL, 'g')) ?? []);
      expect(reads.length).toBeGreaterThan(30);
   });

   it('every read of projects, services, tags and files filters the trash', () => {
      const missing: string[] = [];
      for (const { name, text } of files) {
         for (const match of text.matchAll(new RegExp(READ_CALL, 'g'))) {
            const start = match.index ?? 0;
            const open = start + match[0].length - 1;
            const lineStart = text.lastIndexOf('\n', start - 1);
            const before = text.slice(Math.max(0, start - 1200), start);
            const window = before + callBody(text, open);
            if (!FILTER.test(window)) {
               const line = text.slice(0, lineStart + 1).split('\n').length;
               missing.push(`${name}:${line} ${match[0]}`);
            }
         }
      }
      expect(missing).toEqual([]);
   });

   it('every raw SQL read of the four tables filters the trash', () => {
      const missing: string[] = [];
      for (const { name, text } of files) {
         const lines = text.split('\n');
         lines.forEach((line, index) => {
            if (!RAW_FROM.test(line) || /^\s*(\*|\/\/|\/\*)/.test(line)) return;
            const window = lines.slice(Math.max(0, index - 2), index + 4).join('\n');
            if (!RAW_FILTER.test(window)) missing.push(`${name}:${index + 1} ${line.trim()}`);
         });
      }
      expect(missing).toEqual([]);
   });
});
