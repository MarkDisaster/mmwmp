import { readFileSync } from 'fs';
import { join } from 'path';

const ADMIN_COPY = join(__dirname, '../../../../../admin/src/utils/url.ts');
const API_RULE = join(__dirname, '../is-http-url.decorator.ts');

const ruleOf = (path: string) => {
   const source = readFileSync(path, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
   const start = source.indexOf('export const MAX_URL_LENGTH');
   const end = source.indexOf('export const IsHttpUrl');
   return source
      .slice(start, end === -1 ? undefined : end)
      .replace(/\s+/g, ' ')
      .trim();
};

describe('isHttpUrl copies', () => {
   it('should have the same rule in the API and in the admin', () => {
      expect(ruleOf(ADMIN_COPY)).toBe(ruleOf(API_RULE));
   });
});
