import {
   ACCEL_SWITCH_TIME,
   MAX_SPEED,
   MIN_LOOKAHEAD_TIME,
   MOBILE_MAX_SPEED,
   MOBILE_SPEED_FACTOR,
   ROBOT_SIZE,
   ROBOT_X,
   SPEED_ACCEL_EARLY,
   SPEED_ACCEL_LATE,
   START_SPEED,
} from './constants';
import { type PhaseLabel } from './phaseLabel';
import {
   DELIVERY_BONUS,
   type Phase,
   PHASES,
   VERSION_TWO_AT,
   VETERAN_SHIFT,
   WAVE_CALM,
   WAVE_INTERVAL,
   WAVE_LENGTH,
} from './phases';
import { type GameState, versionLabel, type World } from './state';

export function skipTo(s: GameState, seconds: number): void {
   s.run.tally.seconds = seconds;
   const index = Math.max(
      0,
      PHASES.findLastIndex((p) => p.start <= seconds),
   );
   s.run.phase = index;
   s.director.spawnPhase = index;
   for (const phase of PHASES.slice(0, index + 1)) {
      const events = phase.finale ? [...phase.debuts, phase.finale] : phase.debuts;
      events.forEach((event, i) => {
         if (event.at >= seconds) return;
         s.director.fired.add(`${phase.id}:${i}`);
         for (const step of event.steps) s.director.unlocked.add(step.kind);
      });
   }
   const phase = PHASES[index];
   if (phase.id === 'maintenance') {
      s.director.waveAt =
         phase.start + WAVE_INTERVAL * Math.ceil((seconds - phase.start) / WAVE_INTERVAL || 1);
   }
}

export function phaseClock(s: GameState, world: World): number {
   return s.run.tally.seconds + (world.veteran ? VETERAN_SHIFT : 0);
}

function baseSpeed(seconds: number): number {
   const early = Math.min(seconds, ACCEL_SWITCH_TIME);
   const late = Math.max(0, seconds - ACCEL_SWITCH_TIME);
   return Math.min(MAX_SPEED, START_SPEED + early * SPEED_ACCEL_EARLY + late * SPEED_ACCEL_LATE);
}

export function speedFor(seconds: number, world: World): number {
   const base = baseSpeed(seconds);
   if (!world.mobile) return base;
   const lookahead = (world.width - ROBOT_X - ROBOT_SIZE) / MIN_LOOKAHEAD_TIME;
   const cap = Math.max(START_SPEED, Math.min(MOBILE_MAX_SPEED, lookahead));
   return Math.min(cap, Math.max(START_SPEED, base * MOBILE_SPEED_FACTOR));
}

const DELIVERY_CELEBRATION = 2.5;

export function enterNextPhase(s: GameState): void {
   s.run.phase = Math.min(PHASES.length - 1, s.run.phase + 1);
   const phase = PHASES[s.run.phase];
   if (phase.id !== 'maintenance') {
      s.events.push({ type: 'phaseEntered', phase: phase.id });
      return;
   }
   s.run.celebrate = DELIVERY_CELEBRATION;
   s.run.tally.points += DELIVERY_BONUS;
   s.events.push({ type: 'delivered', bonus: DELIVERY_BONUS, y: s.robot.y });
   s.director.waveAt = phase.start + WAVE_INTERVAL;
}

export function nextVersion(s: GameState): void {
   const major =
      s.run.version.major === 1 && s.run.clock >= VERSION_TWO_AT ? 2 : s.run.version.major;
   s.run.version =
      major === s.run.version.major
         ? { major, minor: s.run.version.minor + 1 }
         : { major, minor: 0 };
   s.events.push({ type: 'versionReleased', version: s.run.version });
}

export function phaseLabel(s: GameState): PhaseLabel {
   if (s.run.celebrate > 0) return 'delivered';
   const id = PHASES[s.run.phase].id;
   return id === 'maintenance' ? `v${versionLabel(s.run.version)}` : id;
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

export function phaseProgress(phase: Phase, clock: number): number {
   return Math.min(1, Math.max(0, (clock - phase.start) / (phase.rampEnd - phase.start)));
}

export const ramp = ([from, to]: [number, number], progress: number) => lerp(from, to, progress);

export function updateWave(s: GameState, clock: number): void {
   if (clock >= s.director.waveAt) {
      s.director.waveUntil = s.director.waveAt + WAVE_LENGTH;
      s.director.waveAt += WAVE_INTERVAL;
   } else if (s.director.waveUntil > -Infinity && clock >= s.director.waveUntil) {
      s.director.waveUntil = -Infinity;
      s.director.calmNext = WAVE_CALM;
      s.director.closesWave = true;
   }
}

export const inWave = (s: GameState) => s.director.waveUntil > -Infinity;
