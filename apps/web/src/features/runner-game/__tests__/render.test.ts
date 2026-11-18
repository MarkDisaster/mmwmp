import { afterEach, describe, expect, it, vi } from 'vitest';

import { STEP } from '../engine/constants';
import { beginRun, step } from '../engine/engine';
import { createState } from '../engine/state';
import { createEffects } from '../render/effects';
import { drawGame, drawX, SpriteCache, type View } from '../render/render';
import { makeObstacle, makeWorld } from './helpers';

const fakeContext = (calls: Record<string, number> = {}) =>
   new Proxy({} as Record<string | symbol, unknown>, {
      get: (target, key) =>
         key in target
            ? target[key]
            : () => {
                 calls[String(key)] = (calls[String(key)] ?? 0) + 1;
              },
      set: (target, key, value) => {
         target[key] = value;
         return true;
      },
   }) as unknown as CanvasRenderingContext2D;

const makeView = (alpha: number, overrides: Partial<View> = {}): View => ({
   ctx: fakeContext(),
   width: 380,
   scale: 3,
   dpr: 1,
   fg: '#ffffff',
   brand: '#0130fe',
   brandFg: '#ffffff',
   font: 'monospace',
   reducedMotion: false,
   deliveredName: '',
   pickupNames: { commit: '', review: '', deploy: '', skill: '', feedback: '', docs: '' },
   milestones: {
      planning: { title: '', subtitle: '' },
      development: { title: '', subtitle: '' },
      testing: { title: '', subtitle: '' },
      launch: { title: '', subtitle: '' },
      maintenance: { title: '', subtitle: '' },
      delivered: { title: '', subtitle: '' },
      version: { title: '', subtitle: '' },
   },
   alpha,
   time: 0,
   sprites: new SpriteCache(),
   ...overrides,
});

describe('drawing', () => {
   it('places a moving thing between its last two positions', () => {
      const view = makeView(0.5);
      expect(drawX(view, makeObstacle('bug', 100, { prevX: 110 }))).toBe(105);
      expect(drawX(view, makeObstacle('bug', 100))).toBe(100);
   });

   it('only reads the game state', () => {
      const world = makeWorld();
      const s = createState(3);
      beginRun(s);
      for (let i = 0; i < 30 / STEP; i++) step(s, STEP, world);
      const before = structuredClone(s);
      drawGame(makeView(0.4), s, createEffects());
      expect(s).toEqual(before);
   });
});

describe('sprite cache', () => {
   afterEach(() => vi.unstubAllGlobals());

   it('paints each sprite once and copies it with drawImage', () => {
      const painted: number[] = [];
      vi.stubGlobal(
         'OffscreenCanvas',
         class {
            constructor(width: number) {
               painted.push(width);
            }
            getContext = () => fakeContext();
         },
      );
      const world = makeWorld();
      const s = createState(5);
      beginRun(s);
      for (let i = 0; i < 10 / STEP; i++) step(s, STEP, world);
      const calls: Record<string, number> = {};
      const view = makeView(1, { ctx: fakeContext(calls), fg: '#123456' });

      drawGame(view, s, createEffects());
      const sprites = painted.length;
      expect(sprites).toBeGreaterThan(0);
      expect(calls.drawImage).toBeGreaterThanOrEqual(sprites);

      drawGame(view, s, createEffects());
      expect(painted.length).toBe(sprites);

      drawGame(makeView(1, { fg: '#654321', sprites: view.sprites }), s, createEffects());
      expect(painted.length).toBe(sprites * 2);
   });
});
