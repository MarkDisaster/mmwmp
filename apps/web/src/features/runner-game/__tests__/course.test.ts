import { describe, expect, it } from 'vitest';

import { DEADLINE_GAP, LOW_DEADLINE_GAP, PAIR_GAP, STEP } from '../engine/constants';
import { beginRun, step } from '../engine/engine';
import { KINDS, type Obstacle } from '../engine/obstacles';
import { phaseLabel, skipTo } from '../engine/progress';
import { createRandom } from '../engine/rng';
import { createState } from '../engine/state';
import { makeWorld, recordCourse, type Spawned, undoDeath } from './helpers';

const SEEDS = [1, 2, 3, 4, 5, 6];
const TOLERANCE = 0.02;

const runsUnder = (o: Obstacle) => o.kind === 'deadline' || o.kind === 'reschedule' || o.lane === 2;

const gapBetween = (a: Spawned, b: Spawned) => b.t - a.t - KINDS[a.obstacle.kind].width / a.speed;

function groundPairs(log: Spawned[]): [Spawned, Spawned][] {
   const enemies = log.filter((e) => e.obstacle.kind !== 'platform' && e.obstacle.elev === 0);
   return enemies.slice(1).map((b, i) => [enemies[i], b]);
}

describe('random', () => {
   it('repeats the same sequence for the same seed', () => {
      const a = createRandom(42);
      const b = createRandom(42);
      expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
   });

   it('stays within 0–1', () => {
      const r = createRandom(7);
      for (let i = 0; i < 1000; i++) {
         const v = r();
         expect(v).toBeGreaterThanOrEqual(0);
         expect(v).toBeLessThan(1);
      }
   });
});

describe('generated course', () => {
   it('is the same for the same seed', () => {
      const kinds = (seed: number) => recordCourse(seed, 60).map((e) => e.obstacle.kind);
      expect(kinds(11)).toEqual(kinds(11));
      expect(kinds(11)).not.toEqual(kinds(12));
   });

   const courses = SEEDS.map((seed) => recordCourse(seed, 300));

   it('never puts two obstacles closer than a quick pair', () => {
      for (const log of courses) {
         for (const [a, b] of groundPairs(log)) {
            expect(gapBetween(a, b)).toBeGreaterThan(PAIR_GAP - TOLERANCE);
         }
      }
   });

   it('keeps room around everything the robot runs under', () => {
      for (const log of courses) {
         for (const [a, b] of groundPairs(log)) {
            if (runsUnder(a.obstacle) || runsUnder(b.obstacle)) {
               expect(gapBetween(a, b)).toBeGreaterThan(DEADLINE_GAP - TOLERANCE);
            }
            if (a.obstacle.kind === 'deadlineLow' || b.obstacle.kind === 'deadlineLow') {
               expect(gapBetween(a, b)).toBeGreaterThan(LOW_DEADLINE_GAP - TOLERANCE);
            }
         }
      }
   });

   it('never brings two shape-shifting obstacles close together', () => {
      for (const log of courses) {
         for (const [a, b] of groundPairs(log)) {
            if (KINDS[a.obstacle.kind].dynamic && KINDS[b.obstacle.kind].dynamic) {
               expect(gapBetween(a, b)).toBeGreaterThan(0.8 - TOLERANCE);
            }
         }
      }
   });

   it('only puts enemies on platforms that can stand there', () => {
      for (const log of courses) {
         for (const { obstacle } of log) {
            if (obstacle.elev === 0) continue;
            expect(obstacle.lane).toBe(0);
            expect(KINDS[obstacle.kind].pit).toBe(false);
         }
      }
   });

   it('keeps pickups inside the game', () => {
      for (const seed of SEEDS) {
         const world = makeWorld();
         const s = createState(seed);
         beginRun(s);
         for (let i = 0; i < 200 / STEP; i++) {
            step(s, STEP, world);
            if (s.run.gameOver) undoDeath(s);
            for (const p of s.entities.pickups) expect(p.y).toBeGreaterThanOrEqual(6);
         }
      }
   });
});

describe('phases', () => {
   it('walks through the project and into versioned maintenance', () => {
      const world = makeWorld();
      const s = createState(3);
      beginRun(s);
      const changes: [string, number][] = [];
      let label: string = phaseLabel(s);
      for (let i = 0; i < 320 / STEP; i++) {
         step(s, STEP, world);
         if (s.run.gameOver) undoDeath(s);
         if (phaseLabel(s) !== label) {
            label = phaseLabel(s);
            changes.push([label, s.run.tally.seconds]);
         }
      }
      expect(changes.map(([name]) => name)).toEqual([
         'development',
         'testing',
         'launch',
         'delivered',
         'v1.0',
         'v1.1',
         'v1.2',
         'v2.0',
      ]);
      const at = Object.fromEntries(changes);
      expect(at.development).toBeGreaterThan(18);
      expect(at.development).toBeLessThan(25);
      expect(at.delivered).toBeGreaterThan(115);
      expect(at.delivered).toBeLessThan(125);
   });

   it('skipTo resumes late in the run as if the start had been played', () => {
      const world = makeWorld();
      const s = createState(5);
      skipTo(s, 110);
      beginRun(s);
      expect(phaseLabel(s)).toBe('launch');
      for (let i = 0; i < 20 / STEP && phaseLabel(s) === 'launch'; i++) {
         step(s, STEP, world);
         if (s.run.gameOver) undoDeath(s);
      }
      expect(phaseLabel(s)).toBe('delivered');
   });
});
