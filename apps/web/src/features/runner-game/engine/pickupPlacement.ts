import {
   DEADLINE_PICKUP_CLEAR,
   PICKUP_GAP_MIN,
   PICKUP_GAP_SPREAD,
   SKILL_MIN_INTERVAL,
} from './constants';
import { type ObstacleKind } from './obstacles';
import { type BugLane, type PhaseId, PHASES } from './phases';
import { platformAt } from './physics';
import { type Pickup, pickupGroup, type PickupRules } from './pickups';
import { phaseClock } from './progress';
import { nextRandom } from './rng';
import { type GameState, type World } from './state';

export const keepsClear = ({ kind, lane }: { kind: ObstacleKind; lane?: BugLane }) =>
   kind === 'deadline' || kind === 'reschedule' || lane === 2;

export function nearDeadline(s: GameState, x: number, seconds: number): boolean {
   const range = s.entities.speed * seconds;
   return s.entities.obstacles.some((o) => keepsClear(o) && Math.abs(o.x - x) < range);
}

const REVIEW_FROM = 20;

const NO_SKILLS: PhaseId[] = ['planning'];

export function pickupRules(s: GameState, world: World): PickupRules {
   const clock = phaseClock(s, world);
   const phase = PHASES[s.director.spawnPhase].id;
   return {
      planning: phase === 'planning',
      review: clock >= REVIEW_FROM,
      skill: !NO_SKILLS.includes(phase) && clock - s.director.lastSkillAt >= SKILL_MIN_INTERVAL,
      docs: phase === 'maintenance',
   };
}

const PICKUP_TOP = 6;

export const raise = (list: Pickup[], by: number): Pickup[] =>
   by ? list.map((p) => ({ ...p, y: Math.max(PICKUP_TOP, p.y - by) })) : list;

export function addPickups(s: GameState, world: World, list: Pickup[]): void {
   if (list.some((p) => p.kind === 'skill')) s.director.lastSkillAt = phaseClock(s, world);
   s.entities.pickups.push(...list);
}

export function spawnPickups(s: GameState, world: World, dt: number): void {
   s.director.pickupIn -= s.entities.speed * dt;
   if (s.director.pickupIn > 0) return;
   const x = world.width + 4;
   const deadlineSoon =
      !!s.director.next &&
      keepsClear(s.director.next) &&
      s.director.spawnIn < s.entities.speed * DEADLINE_PICKUP_CLEAR;
   if (deadlineSoon || nearDeadline(s, x, DEADLINE_PICKUP_CLEAR)) {
      s.director.pickupIn = s.entities.speed * 0.2;
      return;
   }
   const group = pickupGroup(x, pickupRules(s, world), () => nextRandom(s.run));
   addPickups(s, world, raise(group.pickups, platformAt(s, x)?.height ?? 0));
   s.director.pickupIn =
      group.width + s.entities.speed * (PICKUP_GAP_MIN + nextRandom(s.run) * PICKUP_GAP_SPREAD);
}
