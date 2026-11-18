import { describe, expect, it } from 'vitest';

import { MILESTONE_TIME, SHAKE_TIME, SWEEP_TIME } from '../engine/constants';
import {
   advanceBackground,
   advanceGameTime,
   applyEvents,
   createEffects,
   fillBackground,
} from '../render/effects';
import { makeWorld } from './helpers';

describe('effects of game events', () => {
   it('kicks up dust on a jump and on a hard landing only', () => {
      const fx = createEffects();
      applyEvents(fx, [{ type: 'jumped' }]);
      expect(fx.particles).toHaveLength(3);
      applyEvents(fx, [{ type: 'landed', hard: false }]);
      expect(fx.particles).toHaveLength(3);
      applyEvents(fx, [{ type: 'landed', hard: true }]);
      expect(fx.particles).toHaveLength(6);
   });

   it('shakes the screen on a crash', () => {
      const fx = createEffects();
      applyEvents(fx, [{ type: 'died', cause: 'bug' }]);
      expect(fx.shake).toBe(SHAKE_TIME);
   });

   it('floats the points of a collected pickup', () => {
      const fx = createEffects();
      applyEvents(fx, [
         { type: 'collected', pickup: 'skill', x: 50, y: 20, points: 5, label: 'React' },
      ]);
      expect(fx.popups).toEqual([
         expect.objectContaining({ x: 50, y: 20, text: '+5', pickup: 'skill', label: 'React' }),
      ]);
   });

   it('titles a new phase', () => {
      const fx = createEffects();
      applyEvents(fx, [{ type: 'phaseEntered', phase: 'testing' }]);
      expect(fx.milestone).toEqual({ kind: 'testing', life: MILESTONE_TIME, version: '' });
   });

   it('celebrates the delivery: title, blue sweep and the bonus', () => {
      const fx = createEffects();
      applyEvents(fx, [{ type: 'delivered', bonus: 25, y: 32 }]);
      expect(fx.milestone?.kind).toBe('delivered');
      expect(fx.sweep).toBe(SWEEP_TIME);
      expect(fx.popups).toEqual([
         expect.objectContaining({ text: '+25', delivered: true, brand: true }),
      ]);
   });

   it('titles a new maintenance version, a new major version differently', () => {
      const fx = createEffects();
      applyEvents(fx, [{ type: 'versionReleased', version: { major: 1, minor: 3 } }]);
      expect(fx.milestone).toMatchObject({ kind: 'maintenance', version: '1.3' });
      applyEvents(fx, [{ type: 'versionReleased', version: { major: 2, minor: 0 } }]);
      expect(fx.milestone).toMatchObject({ kind: 'version', version: '2.0' });
   });

   it('lets a title drift by for its time, then clears it', () => {
      const fx = createEffects();
      applyEvents(fx, [{ type: 'phaseEntered', phase: 'launch' }]);
      advanceGameTime(fx, MILESTONE_TIME - 0.01);
      expect(fx.milestone).not.toBeNull();
      advanceGameTime(fx, 0.02);
      expect(fx.milestone).toBeNull();
   });
});

describe('background scenery', () => {
   it('fills the view at the start and drifts slower than the track', () => {
      const world = makeWorld();
      const fx = createEffects();
      fillBackground(fx, world);
      expect(fx.background.length).toBeGreaterThan(3);
      const first = fx.background[0].x;
      advanceBackground(fx, 200, world, 0.5);
      expect(fx.background[0].prevX).toBe(first);
      expect(first - fx.background[0].x).toBeGreaterThan(0);
      expect(first - fx.background[0].x).toBeLessThan(200 * 0.5);
   });

   it('stays put with reduced motion', () => {
      const world = makeWorld({ reducedMotion: true });
      const fx = createEffects();
      fillBackground(fx, world);
      const xs = fx.background.map((b) => b.x);
      advanceBackground(fx, 200, world, 0.5);
      expect(fx.background.map((b) => b.x)).toEqual(xs);
   });
});
