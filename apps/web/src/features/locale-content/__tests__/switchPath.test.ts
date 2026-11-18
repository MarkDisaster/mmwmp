import { describe, expect, it } from 'vitest';

import { resolveSwitchPathname } from '../utils/switchPath';

const projects = { a: ['cs'], b: ['cs', 'en'] };

describe('resolveSwitchPathname', () => {
   it('keeps a project that exists in the target locale', () => {
      expect(resolveSwitchPathname('/projects/b', 'en', projects)).toBe('/projects/b');
   });

   it('sends a project without a translation to the project list, not to a 404', () => {
      expect(resolveSwitchPathname('/projects/a', 'en', projects)).toBe('/projects');
      expect(resolveSwitchPathname('/projects/unknown', 'en', projects)).toBe('/projects');
   });

   it('sends a later page of the list to the list', () => {
      expect(resolveSwitchPathname('/projects/page/2', 'en', projects)).toBe('/projects');
   });

   it('keeps any other page', () => {
      expect(resolveSwitchPathname('/about', 'en', projects)).toBe('/about');
      expect(resolveSwitchPathname('/', 'en', projects)).toBe('/');
   });
});
