import { describe, expect, it } from 'vitest';

import cs from '../../../../messages/cs.json';
import en from '../../../../messages/en.json';
import { pixelTextWidth, unsupportedGlyphs } from '../render/pixelFont';

describe('pixel font', () => {
   it('draws every milestone title in every language', () => {
      for (const messages of [cs, en]) {
         for (const phase of Object.values(messages.RunnerGame.phases)) {
            const title = phase.title.replace('{version}', '2.0');
            expect(unsupportedGlyphs(title)).toEqual([]);
         }
      }
   });

   it('reports characters it cannot draw', () => {
      expect(unsupportedGlyphs('VÝVOJ')).toEqual(['Ý']);
   });

   it('measures letters, gaps and spaces', () => {
      expect(pixelTextWidth('A 1')).toBe(13);
   });
});
