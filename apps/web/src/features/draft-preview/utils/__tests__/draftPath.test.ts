import { describe, expect, it } from 'vitest';

import { getDraftPath, isDraftType, resolveDraftLocale } from '../draftPath';

describe('getDraftPath', () => {
   it('opens a project on its detail page', () => {
      expect(getDraftPath('projects', 'cs', 'my-project')).toBe('/cs/projects/my-project');
   });

   it('opens a service on the About page, at its card', () => {
      expect(getDraftPath('services', 'en', 'apps')).toBe('/en/about#apps');
   });
});

describe('resolveDraftLocale', () => {
   it.each(['cs', 'en'])('keeps the known locale %s', (locale) => {
      expect(resolveDraftLocale(locale)).toBe(locale);
   });

   it.each([null, '', 'de', '/example.com', '//example.com', 'CS'])(
      'falls back to the default locale for %j',
      (locale) => {
         expect(resolveDraftLocale(locale)).toBe('cs');
      },
   );
});

describe('isDraftType', () => {
   it.each(['projects', 'services'])('accepts %s', (type) => {
      expect(isDraftType(type)).toBe(true);
   });

   it.each(['tags', '', 'Projects'])('rejects %j', (type) => {
      expect(isDraftType(type)).toBe(false);
   });
});
