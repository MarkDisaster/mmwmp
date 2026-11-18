import { JUMP_BUFFER, MAX_HOLD, ROBOT_GROUND_Y, STEP } from '../engine/constants';
import { beginRun, step } from '../engine/engine';
import type { Obstacle, ObstacleKind } from '../engine/obstacles';
import { pressJump, releaseJump } from '../engine/physics';
import { createState, type GameState, type World } from '../engine/state';

const DESKTOP_WIDTH = 380;
export const MOBILE_WIDTH = 180;

export const BOT_SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
export const BOT_SECONDS = 300;
export const BOT_TIMEOUT = 30_000;
export const FAIR_SEEDS = [1, 2, 3, 4, 5];
export const FAIR_TIMEOUT = 120_000;

export const makeWorld = (overrides: Partial<World> = {}): World => ({
   width: DESKTOP_WIDTH,
   mobile: false,
   reducedMotion: false,
   veteran: false,
   ...overrides,
});

export const makeObstacle = (
   kind: ObstacleKind,
   x: number,
   extra: Partial<Obstacle> = {},
): Obstacle => ({
   kind,
   skin: kind,
   x,
   split: 0,
   shake: 0,
   rise: 0,
   warn: false,
   grow: 0,
   count: 4,
   high: false,
   moves: false,
   lane: 0,
   length: 0,
   height: 0,
   elev: 0,
   endsPhase: false,
   endsWave: false,
   passed: false,
   ...extra,
});

export function quietRun(seconds = 0, world = makeWorld()): { s: GameState; world: World } {
   const s = createState(1);
   s.run.started = true;
   s.director.spawnIn = Infinity;
   s.director.pickupIn = Infinity;
   s.director.platformIn = Infinity;
   s.run.tally.seconds = seconds;
   return { s, world };
}

export function undoDeath(s: GameState): void {
   s.run.gameOver = false;
   s.run.killer = null;
   s.run.cause = null;
   s.robot.y = ROBOT_GROUND_Y;
   s.robot.vy = 0;
   s.robot.grounded = true;
}

export type Spawned = { t: number; obstacle: Obstacle; speed: number };

export function recordCourse(seed: number, seconds: number, world = makeWorld()): Spawned[] {
   const s = createState(seed);
   beginRun(s);
   const seen = new Set<Obstacle>();
   const log: Spawned[] = [];
   for (let i = 0; i < seconds / STEP; i++) {
      step(s, STEP, world);
      if (s.run.gameOver) undoDeath(s);
      for (const o of s.entities.obstacles) {
         if (seen.has(o)) continue;
         seen.add(o);
         log.push({ t: s.run.tally.seconds, obstacle: o, speed: s.entities.speed });
      }
   }
   return log;
}

export function survives(
   s: GameState,
   world: World,
   { pressAt, hold = 0, seconds = 2.5 }: { pressAt?: number; hold?: number; seconds?: number },
   pressJump: (s: GameState) => void,
   releaseJump: (s: GameState) => void,
): boolean {
   const clock = s.run.tally.seconds;
   let t = 0;
   let pressed = false;
   let released = false;
   for (let i = 0; i < seconds / STEP; i++) {
      if (pressAt !== undefined && !pressed && t >= pressAt) {
         pressJump(s);
         pressed = true;
      }
      if (pressed && !released && t >= (pressAt ?? 0) + hold) {
         releaseJump(s);
         released = true;
      }
      step(s, STEP, world);
      s.run.tally.seconds = clock;
      t += STEP;
      if (s.run.gameOver) return false;
   }
   return true;
}

const HOLDS = [STEP, 0.08, 0.15, MAX_HOLD];
const PERSON_HOLDS = Array.from({ length: 8 }, (_, i) => STEP + ((MAX_HOLD - STEP) * i) / 7);
const HORIZON = 2;
const REACH = 1;
const AFTER_LANDING = 0.5;
const YIELD_EVERY_MS = 200;
const LONGEST_FLIGHT = 3;
const PLAN_STEP = 1 / 30;

type Jump = { at: number; hold: number };

function runFor(s: GameState, world: World, seconds: number): number {
   let t = 0;
   while (t < seconds - 1e-9 && !s.run.gameOver) {
      step(s, STEP, world);
      t += STEP;
   }
   return t;
}

function jumpFrom(s: GameState, world: World, hold: number, limit: number): number {
   pressJump(s);
   let t = 0;
   while (t < limit && !s.run.gameOver) {
      if (s.robot.keyHeld && t >= hold) releaseJump(s);
      step(s, STEP, world);
      t += STEP;
      if (s.robot.grounded && !s.robot.keyHeld) break;
   }
   return t;
}

function planJump(s: GameState, world: World, horizon: number): Jump | 'clear' | null {
   const ahead = structuredClone({ s, world });
   const crash = runFor(ahead.s, ahead.world, horizon);
   if (!ahead.s.run.gameOver) return 'clear';
   const sim = structuredClone({ s, world });
   const moments: { t: number; snapshot: { s: GameState; world: World } }[] = [];
   let t = 0;
   let last = -Infinity;
   while (t < crash - 1e-9) {
      if (sim.s.robot.grounded && t >= crash - REACH && t - last >= PLAN_STEP - 1e-9) {
         moments.push({ t, snapshot: structuredClone(sim) });
         last = t;
      }
      step(sim.s, STEP, sim.world);
      t += STEP;
   }
   for (const moment of moments.reverse()) {
      for (const hold of HOLDS) {
         const air = structuredClone(moment.snapshot);
         const flight = jumpFrom(air.s, air.world, hold, LONGEST_FLIGHT);
         if (air.s.run.gameOver) continue;
         const left = Math.max(horizon - moment.t - flight, AFTER_LANDING);
         if (planJump(air.s, air.world, left) !== null) return { at: moment.t, hold };
      }
   }
   return null;
}

export const MIN_WINDOW = 0.09;
const WINDOW_GAP = 2;
const WINDOW_SEARCH = 0.4;

function jumpWorksFrom(
   ground: { s: GameState; world: World },
   holds: number[],
   horizon: number,
): boolean {
   if (ground.s.run.gameOver) return false;
   return holds.some((hold) => {
      const air = structuredClone(ground);
      const flight = jumpFrom(air.s, air.world, hold, LONGEST_FLIGHT);
      if (air.s.run.gameOver) return false;
      return planJump(air.s, air.world, Math.max(horizon - flight, AFTER_LANDING)) !== null;
   });
}

function jumpWindow(s: GameState, world: World, plan: Jump, justLanded: boolean): number {
   const holds = [...PERSON_HOLDS].sort(
      (a, b) => Math.abs(a - plan.hold) - Math.abs(b - plan.hold),
   );
   const from = Math.max(0, plan.at - WINDOW_SEARCH);
   function* moments(): Generator<boolean> {
      const sim = structuredClone({ s, world });
      runFor(sim.s, sim.world, from);
      for (
         let t = from;
         t <= plan.at + WINDOW_GAP * STEP + 1e-9 && !sim.s.run.gameOver;
         t += STEP
      ) {
         yield jumpWorksFrom(structuredClone(sim), holds, HORIZON - t);
         step(sim.s, STEP, sim.world);
      }
   }
   const buffered = from === 0 && justLanded ? Math.round(JUMP_BUFFER / STEP) : 0;
   return windowLength(moments(), Math.round(MIN_WINDOW / STEP), buffered) * STEP;
}

export function windowLength(moments: Iterable<boolean>, needed: number, buffered = 0): number {
   let best = 0;
   let run = 0;
   let misses = 0;
   let first = true;
   for (const works of moments) {
      if (works) {
         run += first ? 1 + buffered : 1;
         misses = 0;
         best = Math.max(best, run);
         if (best >= needed) break;
      } else if (++misses > WINDOW_GAP) {
         run = 0;
      }
      first = false;
   }
   return Math.min(best, needed);
}

export type BotResult = {
   survived: boolean;
   seconds: number;
   score: number;
   window?: number;
};

export async function playCourse(
   seed: number,
   seconds: number,
   world = makeWorld(),
   { fair = false, onJump }: { fair?: boolean; onJump?: (s: GameState, hold: number) => void } = {},
): Promise<BotResult> {
   const s = createState(seed);
   beginRun(s);
   let justLanded = false;
   let yielded = performance.now();
   while (s.run.tally.seconds < seconds && !s.run.gameOver) {
      if (performance.now() - yielded > YIELD_EVERY_MS) {
         await new Promise((resolve) => setImmediate(resolve));
         yielded = performance.now();
      }
      if (!s.robot.grounded) {
         step(s, STEP, world);
         continue;
      }
      const plan = planJump(s, world, HORIZON);
      if (plan === null)
         return { survived: false, seconds: s.run.tally.seconds, score: s.run.score };
      if (plan === 'clear') {
         runFor(s, world, HORIZON / 2);
         justLanded = false;
         continue;
      }
      if (fair) {
         const window = jumpWindow(s, world, plan, justLanded);
         if (window < MIN_WINDOW - 1e-9) {
            return {
               survived: false,
               seconds: s.run.tally.seconds + plan.at,
               score: s.run.score,
               window,
            };
         }
      }
      runFor(s, world, plan.at);
      onJump?.(s, plan.hold);
      jumpFrom(s, world, plan.hold, LONGEST_FLIGHT);
      justLanded = true;
   }
   return { survived: !s.run.gameOver, seconds: s.run.tally.seconds, score: s.run.score };
}
