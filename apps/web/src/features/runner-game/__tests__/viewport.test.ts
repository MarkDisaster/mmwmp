import { describe, expect, it } from 'vitest';

import {
   HEADROOM,
   MOBILE_BREAKPOINT_PX,
   SCALE_DESKTOP,
   SCALE_MOBILE,
   WORLD_HEIGHT,
} from '../engine/constants';
import { canvasSize } from '../runtime/viewport';

const DESKTOP_HEIGHT = (WORLD_HEIGHT + HEADROOM) * SCALE_DESKTOP;

describe('canvas size', () => {
   it('takes the device pixels the browser reports, exactly', () => {
      const size = canvasSize(
         { inline: 611.2, block: DESKTOP_HEIGHT },
         { inline: 917, block: 297 },
         1.5,
         1280,
      );
      expect(size).toMatchObject({ width: 917, height: 297, cssHeight: DESKTOP_HEIGHT });
   });

   it('rounds the CSS size at a fractional pixel ratio instead of truncating it', () => {
      const size = canvasSize({ inline: 611.4, block: DESKTOP_HEIGHT }, undefined, 1.25, 1280);
      expect(size).toMatchObject({ width: 764, height: 248 });
   });

   it('does not take a measured height that belongs to the previous scale', () => {
      const size = canvasSize(
         { inline: 400, block: DESKTOP_HEIGHT },
         { inline: 800, block: DESKTOP_HEIGHT * 2 },
         2,
         MOBILE_BREAKPOINT_PX - 1,
      );
      const mobileHeight = (WORLD_HEIGHT + HEADROOM) * SCALE_MOBILE;
      expect(size).toMatchObject({
         scale: SCALE_MOBILE,
         cssHeight: mobileHeight,
         width: 800,
         height: mobileHeight * 2,
      });
   });

   it('reaches up by the headroom at the scale of the window', () => {
      expect(
         canvasSize({ inline: 300, block: 0 }, undefined, 1, MOBILE_BREAKPOINT_PX),
      ).toMatchObject({ scale: SCALE_DESKTOP, headroom: HEADROOM * SCALE_DESKTOP });
      expect(
         canvasSize({ inline: 300, block: 0 }, undefined, 1, MOBILE_BREAKPOINT_PX - 1),
      ).toMatchObject({ scale: SCALE_MOBILE, headroom: HEADROOM * SCALE_MOBILE });
   });
});
