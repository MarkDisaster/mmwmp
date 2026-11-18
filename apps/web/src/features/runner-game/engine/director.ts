import {
   DEADLINE_GAP,
   DEADLINE_PICKUP_CLEAR,
   INTRO_GAP,
   LOW_DEADLINE_GAP,
   PAIR_GAP,
   ROBOT_X,
} from './constants';
import {
   DEADLINE_BOOST,
   fitsOnPlatform,
   KINDS,
   LANES,
   type Obstacle,
   type ObstacleKind,
   PLATFORM_HEIGHTS,
   PLATFORM_MAX,
   PLATFORM_MIN,
   widthOf,
} from './obstacles';
import { type BugLane, DELIVERY_CALM, type Phase, PHASE_CALM, PHASES, skinFor } from './phases';
import { platformAt } from './physics';
import { addPickups, keepsClear, nearDeadline, pickupRules, raise } from './pickupPlacement';
import { deliveryArc, obstaclePickups, rewardPickup } from './pickups';
import { inWave, phaseClock, phaseProgress, ramp, updateWave } from './progress';
import { nextRandom } from './rng';
import { type GameState, type NextObstacle, type World } from './state';

function scripted(
   s: GameState,
   kind: ObstacleKind,
   phase: Phase,
   step: Partial<NextObstacle>,
): NextObstacle {
   return {
      kind,
      skin: skinFor(kind, phase.id, () => nextRandom(s.run)),
      scripted: true,
      endsPhase: false,
      ...step,
   };
}

function dueEvent(s: GameState, phase: Phase, clock: number): NextObstacle[] | null {
   const events = phase.finale ? [...phase.debuts, phase.finale] : phase.debuts;
   for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const key = `${phase.id}:${i}`;
      if (event.at > clock || s.director.fired.has(key)) continue;
      s.director.fired.add(key);
      const finale = event === phase.finale;
      const last = event.steps.length - 1;
      return event.steps.map((step, j) => {
         s.director.unlocked.add(step.kind);
         return scripted(s, step.kind, phase, {
            gap: step.gap ?? (finale ? undefined : INTRO_GAP),
            reward: step.reward,
            drops: step.drops,
            lane: step.lane,
            endsPhase: finale && j === last && s.director.spawnPhase < PHASES.length - 1,
         });
      });
   }
   return null;
}

function drawable(
   s: GameState,
   phase: Phase,
   allowed: (kind: ObstacleKind) => boolean = () => true,
): [ObstacleKind, number][] {
   const debutsHere = new Set(phase.debuts.flatMap((e) => e.steps.map((st) => st.kind)));
   return (Object.entries(phase.weights) as [ObstacleKind, number][]).filter(
      ([kind]) => allowed(kind) && (!debutsHere.has(kind) || s.director.unlocked.has(kind)),
   );
}

function randomKind(
   s: GameState,
   phase: Phase,
   allowed: (kind: ObstacleKind) => boolean = () => true,
): ObstacleKind {
   const pool = drawable(s, phase, allowed);
   const total = pool.reduce((sum, [, w]) => sum + w, 0);
   let roll = nextRandom(s.run) * total;
   for (const [kind, weight] of pool) {
      roll -= weight;
      if (roll <= 0) return kind;
   }
   return pool[0][0];
}

function pickNext(s: GameState, world: World): NextObstacle {
   const phase = PHASES[s.director.spawnPhase];
   let next = s.director.script.shift();
   if (!next) {
      const lead = phase.gapBase[0] + (world.width - ROBOT_X) / s.entities.speed;
      const clock = phaseClock(s, world) + lead;
      updateWave(s, clock);
      const event = dueEvent(s, phase, clock);
      if (event) {
         next = event[0];
         s.director.script.push(...event.slice(1));
      } else {
         const kind = randomKind(s, phase);
         next = {
            kind,
            skin: skinFor(kind, phase.id, () => nextRandom(s.run)),
            scripted: false,
            endsPhase: false,
         };
      }
   }
   if (next.lane === undefined) next.lane = randomLane(s, phase, next.kind);
   if (s.director.calmNext > 0) {
      next.gap = Math.max(s.director.calmNext, next.gap ?? 0);
      s.director.calmNext = 0;
   }
   if (next.endsPhase) {
      s.director.spawnPhase++;
      s.director.calmNext =
         PHASES[s.director.spawnPhase].id === 'maintenance' ? DELIVERY_CALM : PHASE_CALM;
   }
   return next;
}

function nextGap(s: GameState, world: World, current: NextObstacle, next: NextObstacle): number {
   const { kind } = current;
   let gap = next.gap;
   if (gap === undefined) {
      const phase = PHASES[s.director.spawnPhase];
      const progress = phaseProgress(phase, phaseClock(s, world));
      const bothDynamic = KINDS[kind].dynamic && KINDS[next.kind].dynamic;
      const chance = s.director.lastPair
         ? ramp(phase.triple, progress)
         : ramp(phase.pair, progress);
      const pair = !bothDynamic && (inWave(s) || nextRandom(s.run) < chance);
      s.director.lastPair = pair;
      gap = pair
         ? PAIR_GAP
         : ramp(phase.gapBase, progress) + nextRandom(s.run) * ramp(phase.gapSpread, progress);
   }
   if (next.gap === undefined) gap = payDebt(s, gap);
   if (keepsClear(current) || keepsClear(next)) gap = Math.max(DEADLINE_GAP, gap);
   if (kind === 'deadlineLow' || next.kind === 'deadlineLow') gap = Math.max(LOW_DEADLINE_GAP, gap);
   if (KINDS[kind].dynamic && KINDS[next.kind].dynamic) gap = Math.max(DYNAMIC_GAP, gap);
   return Math.max(PAIR_GAP, gap);
}

const DYNAMIC_GAP = 0.8;

function payDebt(s: GameState, gap: number): number {
   const paid = Math.min(s.director.gapDebt, Math.max(0, gap - PAIR_GAP));
   s.director.gapDebt -= paid;
   return gap - paid;
}

function randomLane(s: GameState, phase: Phase, kind: ObstacleKind): BugLane {
   const allowed = LANES[kind];
   if (!allowed) return 0;
   const total = allowed.reduce<number>((sum, lane) => sum + phase.lanes[lane], 0);
   let roll = nextRandom(s.run) * total;
   for (const lane of allowed) {
      roll -= phase.lanes[lane];
      if (roll <= 0) return lane;
   }
   return 0;
}

function rescheduleLanes(s: GameState, next: NextObstacle): { high: boolean; moves: boolean } {
   if (next.kind !== 'reschedule') return { high: false, moves: false };
   if (next.drops !== undefined) return { high: next.drops, moves: true };
   const maintenance = PHASES[s.director.spawnPhase].id === 'maintenance';
   return { high: nextRandom(s.run) < 0.5, moves: !maintenance || nextRandom(s.run) < 0.5 };
}

const PLATFORM_FROM = 10;

const PLATFORM_ENTRY = 0.1;

const HIGH_PLATFORM_ENTRY = 0.25;

const HIGH_PLATFORM_QUESTION_ENTRY = 0.4;

const PLATFORM_EXIT = 0.05;

const PLATFORM_HOP = 0.4;

const PLATFORM_RUN_UP = 0.55;

const PLATFORM_EDGE = 6;

const PLATFORM_PAIR_CHANCE = 0.5;

const HIGH_PLATFORM_CHANCE = 0.4;

const exitRoom = (next: NextObstacle) => (keepsClear(next) ? DEADLINE_GAP : PLATFORM_EXIT);

function entryTime(platform: Obstacle, next: NextObstacle): number {
   if (platform.height <= PLATFORM_HEIGHTS[0]) return PLATFORM_ENTRY;
   return next.skin === 'question' ? HIGH_PLATFORM_QUESTION_ENTRY : HIGH_PLATFORM_ENTRY;
}

function platformWait(s: GameState, next: NextObstacle, x: number): number {
   const platform = s.entities.obstacles.find(
      (o) =>
         o.kind === 'platform' &&
         x >= o.x &&
         x < o.x + o.length + s.entities.speed * exitRoom(next),
   );
   if (!platform) return 0;
   const end = platform.x + platform.length;
   const entry = platform.x + s.entities.speed * entryTime(platform, next);
   if (x < entry) return entry - x;
   const fits =
      fitsOnPlatform(next.kind, platform) &&
      (next.lane ?? 0) === 0 &&
      x + KINDS[next.kind].width <= end - PLATFORM_EDGE;
   if (x < end && fits) return 0;
   return Math.max(0, end + s.entities.speed * exitRoom(next) - x);
}

function onTopOf(s: GameState, next: NextObstacle, platform: Obstacle, x: number): NextObstacle {
   const room = platform.x + platform.length - PLATFORM_EDGE - x;
   const phase = PHASES[s.director.spawnPhase];
   const fits = (k: ObstacleKind) => fitsOnPlatform(k, platform) && KINDS[k].width <= room;
   if (next.scripted || ((next.lane ?? 0) === 0 && fits(next.kind))) return next;
   if (drawable(s, phase, fits).length === 0) return next;
   const kind = randomKind(s, phase, fits);
   return {
      kind,
      skin: skinFor(kind, phase.id, () => nextRandom(s.run)),
      scripted: false,
      endsPhase: next.endsPhase,
      lane: 0,
   };
}

export function spawnPlatforms(s: GameState, world: World, dt: number): void {
   if (phaseClock(s, world) < PLATFORM_FROM) return;
   s.director.platformIn -= s.entities.speed * dt;
   if (s.director.platformIn > 0) return;
   const x = world.width + 4;
   const crowded = s.entities.obstacles.some(
      (o) =>
         o.kind !== 'platform' &&
         o.x + widthOf(o) > x - s.entities.speed * (keepsClear(o) ? DEADLINE_GAP : PLATFORM_RUN_UP),
   );
   const yields = !!s.director.next?.scripted;
   if (crowded || yields) {
      s.director.platformIn = s.entities.speed * 0.1;
      return;
   }
   const [low, high] = PLATFORM_HEIGHTS;
   const length = PLATFORM_MIN + nextRandom(s.run) * (PLATFORM_MAX - PLATFORM_MIN);
   s.entities.obstacles.push({
      kind: 'platform',
      skin: 'platform',
      x,
      split: 0,
      shake: 0,
      rise: 0,
      warn: false,
      grow: 0,
      count: 0,
      high: false,
      moves: false,
      lane: 0,
      length,
      height: nextRandom(s.run) < HIGH_PLATFORM_CHANCE ? high : low,
      elev: 0,
      endsPhase: false,
      endsWave: false,
      passed: false,
   });
   const [min, max] = PHASES[s.director.spawnPhase].platformGap;
   const gap =
      nextRandom(s.run) < PLATFORM_PAIR_CHANCE
         ? PLATFORM_HOP
         : min + nextRandom(s.run) * (max - min);
   s.director.platformIn = length + s.entities.speed * gap;
}

export function spawn(s: GameState, world: World): void {
   const x = world.width + 4;
   const below = platformAt(s, x);
   const picked = s.director.next ?? pickNext(s, world);
   const next = below ? onTopOf(s, picked, below, x) : picked;
   const wait = platformWait(s, next, x);
   if (wait > 0) {
      s.director.next = next;
      s.director.spawnIn = wait;
      s.director.gapDebt += wait / s.entities.speed;
      return;
   }
   s.director.next = pickNext(s, world);
   const endsWave = s.director.closesWave;
   s.director.closesWave = false;
   const { kind, skin } = next;
   const lane = next.lane ?? 0;
   const def = KINDS[kind];
   const elev = below?.height ?? 0;
   s.entities.obstacles.push({
      kind,
      skin,
      x,
      split: 0,
      shake: 0,
      rise: 0,
      warn: false,
      grow: 0,
      count: 4 + Math.round(nextRandom(s.run)),
      ...rescheduleLanes(s, next),
      lane,
      length: 0,
      height: 0,
      elev,
      endsPhase: next.endsPhase,
      endsWave,
      passed: false,
   });
   if (next.endsPhase && PHASES[s.director.spawnPhase].id === 'maintenance') {
      addPickups(s, world, deliveryArc(x + def.width + s.entities.speed * 0.6));
   }

   if (keepsClear(next)) {
      const clear = s.entities.speed * DEADLINE_PICKUP_CLEAR * (1 + DEADLINE_BOOST);
      s.entities.pickups = s.entities.pickups.filter((p) => p.x < x - clear);
   }
   if (!nearDeadline(s, x, DEADLINE_PICKUP_CLEAR) && lane === 0) {
      const rewards = next.reward
         ? [rewardPickup(next.reward, kind, x)]
         : obstaclePickups(kind, x, pickupRules(s, world), () => nextRandom(s.run));
      addPickups(s, world, raise(rewards, elev));
   }
   s.director.spawnIn = def.width + s.entities.speed * nextGap(s, world, next, s.director.next);
}
