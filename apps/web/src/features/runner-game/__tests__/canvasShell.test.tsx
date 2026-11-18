import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { RunnerGame } from '../components/RunnerGame';
import { MOBILE_BREAKPOINT_PX, SCALE_DESKTOP, SCALE_MOBILE } from '../engine/constants';
import { canvasSize } from '../runtime/viewport';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('../hooks/useGameLabels', () => ({ useGameLabels: () => ({}) }));

function serverCanvas() {
   const html = renderToStaticMarkup(createElement(RunnerGame));
   const canvas = html.match(/<canvas [^>]*>/)?.[0] ?? '';
   const scales = [...canvas.matchAll(/(?:^|\s)(md:)?\[--s:(\d+)\]/g)].map(([, md, s]) => ({
      md: Boolean(md),
      scale: Number(s),
   }));
   const style = canvas.match(/style="([^"]*)"/)?.[1] ?? '';
   const at = (property: string, scale: number) => {
      const units = style.match(
         new RegExp(`${property}:calc\\((-?\\d+) \\* var\\(--s\\) \\* 1px\\)`),
      );
      return units ? Number(units[1]) * scale : undefined;
   };
   return { scales, at };
}

describe('runner game canvas in the server HTML', () => {
   it('has the mobile and the desktop scale of the engine, switching at its breakpoint', () => {
      const { scales } = serverCanvas();
      expect(scales).toEqual([
         { md: false, scale: SCALE_MOBILE },
         { md: true, scale: SCALE_DESKTOP },
      ]);
      expect(MOBILE_BREAKPOINT_PX).toBe(768);
   });

   it.each([
      ['mobile', SCALE_MOBILE, MOBILE_BREAKPOINT_PX - 1],
      ['desktop', SCALE_DESKTOP, MOBILE_BREAKPOINT_PX],
   ])(
      'is as tall and pulled up as far as the engine sets it on %s, so it does not shift',
      (_, scale, windowWidth) => {
         const { at } = serverCanvas();
         const engine = canvasSize({ inline: 300, block: 0 }, undefined, 1, windowWidth);
         expect(at('height', scale)).toBe(engine.cssHeight);
         expect(at('margin-top', scale)).toBe(-engine.headroom);
      },
   );
});
