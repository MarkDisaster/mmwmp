import { describe, expect, it } from 'vitest';

import { STEP } from '../engine/constants';
import { beginRun, step } from '../engine/engine';
import type { Obstacle } from '../engine/obstacles';
import type { Pickup } from '../engine/pickups';
import { phaseLabel } from '../engine/progress';
import { createState, type GameEvent, type GameState, versionLabel } from '../engine/state';
import { makeWorld, MOBILE_WIDTH, playCourse, undoDeath } from './helpers';

const SEEDS = [1, 2, 3, 4, 5];
const BOT_SEEDS = [1, 2];
const SECONDS = 300;
const DESKTOP = makeWorld();
const MOBILE = makeWorld({ width: MOBILE_WIDTH, mobile: true });

const time = (t: number) => Math.round(t * 1000) / 1000;

function describeEvent(event: GameEvent): string | null {
   if (event.type === 'phaseEntered') return `phaseEntered ${event.phase}`;
   if (event.type === 'delivered') return `delivered +${event.bonus}`;
   if (event.type === 'versionReleased') return `versionReleased ${versionLabel(event.version)}`;
   return null;
}

const countBy = (items: string[]) =>
   Object.fromEntries(
      [...new Set(items)].sort().map((key) => [key, items.filter((i) => i === key).length]),
   );

function record(seed: number, world = DESKTOP) {
   const s = createState(seed);
   beginRun(s);
   const seenObstacles = new Set<Obstacle>();
   const seenPickups = new Set<Pickup>();
   const obstacles: string[] = [];
   const pickups: string[] = [];
   const phases: string[] = [];
   const events: string[] = [];
   const kinds: string[] = [];
   const pickupKinds: string[] = [];
   const logEvents = (state: GameState) => {
      for (const event of state.events) {
         const text = describeEvent(event);
         if (text) events.push(`${time(state.run.tally.seconds)} ${text}`);
      }
   };
   logEvents(s);
   let nextSecond = 0;
   for (let i = 0; i < SECONDS / STEP; i++) {
      step(s, STEP, world);
      logEvents(s);
      if (s.run.gameOver) undoDeath(s);
      for (const o of s.entities.obstacles) {
         if (seenObstacles.has(o)) continue;
         seenObstacles.add(o);
         obstacles.push(`${time(s.run.tally.seconds)} ${o.kind} ${o.skin} ${o.lane} ${o.elev}`);
         kinds.push(o.kind);
      }
      for (const p of s.entities.pickups) {
         if (seenPickups.has(p)) continue;
         seenPickups.add(p);
         pickups.push(`${time(s.run.tally.seconds)} ${p.kind} ${p.label} ${time(p.y)}`);
         pickupKinds.push(p.kind);
      }
      if (s.run.tally.seconds >= nextSecond) {
         phases.push(phaseLabel(s));
         nextSecond++;
      }
   }
   const summary = {
      score: s.run.score,
      obstacles: countBy(kinds),
      pickups: countBy(pickupKinds),
      milestones: events,
   };
   return {
      summary,
      detail: { obstacles, pickups, phases, events, score: s.run.score, tally: s.run.tally },
   };
}

async function botRecord(seed: number, world = DESKTOP) {
   const jumps: string[] = [];
   const result = await playCourse(seed, SECONDS, world, {
      onJump: (s, hold) => jumps.push(`${time(s.run.tally.seconds)} ${time(hold)}`),
   });
   return { summary: { ...result, seconds: time(result.seconds), jumps: jumps.length }, jumps };
}

const runs = [
   ...SEEDS.map((seed) => ({ name: `seed ${seed} at desktop width`, seed, world: DESKTOP })),
   ...SEEDS.map((seed) => ({ name: `seed ${seed} at mobile width`, seed, world: MOBILE })),
];
const botRuns = [
   ...BOT_SEEDS.map((seed) => ({
      name: `bot plays seed ${seed} at desktop width`,
      seed,
      world: DESKTOP,
   })),
   ...BOT_SEEDS.map((seed) => ({
      name: `bot plays seed ${seed} at mobile width`,
      seed,
      world: MOBILE,
   })),
];
const recorded = new Map<string, ReturnType<typeof record>>();
const botRecorded = new Map<string, ReturnType<typeof botRecord>>();
const once = <T>(cache: Map<string, T>, key: string, make: () => T) => {
   if (!cache.has(key)) cache.set(key, make());
   return cache.get(key) as T;
};

describe('golden run summaries', () => {
   for (const { name, seed, world } of runs) {
      it(name, () => {
         expect(once(recorded, name, () => record(seed, world)).summary).toMatchSnapshot();
      });
   }

   it.each(botRuns)(
      '$name',
      async ({ name, seed, world }) => {
         expect(
            (await once(botRecorded, name, () => botRecord(seed, world))).summary,
         ).toMatchSnapshot();
      },
      30_000,
   );
});

describe('golden runs', () => {
   for (const { name, seed, world } of runs) {
      it(name, () => {
         expect(once(recorded, name, () => record(seed, world)).detail).toMatchSnapshot();
      });
   }

   it.each(botRuns)(
      '$name',
      async ({ name, seed, world }) => {
         expect(
            (await once(botRecorded, name, () => botRecord(seed, world))).jumps,
         ).toMatchSnapshot();
      },
      30_000,
   );
});
