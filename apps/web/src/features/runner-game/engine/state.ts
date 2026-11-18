import { ROBOT_GROUND_Y, START_SPEED } from './constants';
import { type Obstacle, type ObstacleKind, type Skin } from './obstacles';
import { type BugLane, type PhaseId, type Reward } from './phases';
import { type Pickup, type PickupKind } from './pickups';
import { randomSeed } from './rng';

export type Tally = {
   seconds: number;
   obstacles: number;
   points: number;
};

export type MilestoneKind = PhaseId | 'delivered' | 'version';

export type Version = { major: number; minor: number };

export const versionLabel = (v: Version): `${number}.${number}` => `${v.major}.${v.minor}`;

type RunState = {
   seed: number;
   rng: number;
   started: boolean;
   gameOver: boolean;
   cause: Skin | null;
   killer: Obstacle | null;
   score: number;
   tally: Tally;
   clock: number;
   phase: number;
   version: Version;
   celebrate: number;
};

type RobotState = {
   y: number;
   prevY: number;
   vy: number;
   grounded: boolean;
   holding: boolean;
   keyHeld: boolean;
   holdTime: number;
   jumpBuffer: number;
   overPit: number;
};

type EntityState = {
   speed: number;
   obstacles: Obstacle[];
   pickups: Pickup[];
};

type DirectorState = {
   spawnIn: number;
   pickupIn: number;
   platformIn: number;
   gapDebt: number;
   lastSkillAt: number;
   spawnPhase: number;
   waveAt: number;
   waveUntil: number;
   closesWave: boolean;
   lastPair: boolean;
   script: NextObstacle[];
   fired: Set<string>;
   unlocked: Set<ObstacleKind>;
   calmNext: number;
   next: NextObstacle | null;
};

export type GameEvent =
   | { type: 'jumped' }
   | { type: 'landed'; hard: boolean }
   | { type: 'died'; cause: Skin }
   | { type: 'collected'; pickup: PickupKind; x: number; y: number; points: number; label: string }
   | { type: 'phaseEntered'; phase: PhaseId }
   | { type: 'delivered'; bonus: number; y: number }
   | { type: 'versionReleased'; version: Version };

export type GameState = {
   run: RunState;
   robot: RobotState;
   entities: EntityState;
   director: DirectorState;
   events: GameEvent[];
};

export type NextObstacle = {
   kind: ObstacleKind;
   skin: Skin;
   scripted: boolean;
   gap?: number;
   reward?: Reward;
   drops?: boolean;
   lane?: BugLane;
   endsPhase: boolean;
};

export type World = {
   readonly width: number;
   readonly mobile: boolean;
   readonly reducedMotion: boolean;
   readonly veteran: boolean;
};

export function createState(seed: number = randomSeed()): GameState {
   return {
      run: {
         seed,
         rng: seed >>> 0,
         started: false,
         gameOver: false,
         cause: null,
         killer: null,
         score: 0,
         tally: { seconds: 0, obstacles: 0, points: 0 },
         clock: 0,
         phase: 0,
         version: { major: 1, minor: 0 },
         celebrate: 0,
      },
      robot: {
         y: ROBOT_GROUND_Y,
         prevY: ROBOT_GROUND_Y,
         vy: 0,
         grounded: true,
         holding: false,
         keyHeld: false,
         holdTime: 0,
         jumpBuffer: 0,
         overPit: 0,
      },
      entities: {
         speed: START_SPEED,
         obstacles: [],
         pickups: [],
      },
      director: {
         spawnIn: 60,
         pickupIn: 0,
         platformIn: 0,
         gapDebt: 0,
         lastSkillAt: -Infinity,
         spawnPhase: 0,
         waveAt: Infinity,
         waveUntil: -Infinity,
         closesWave: false,
         lastPair: false,
         script: [],
         fired: new Set(),
         unlocked: new Set(),
         calmNext: 0,
         next: null,
      },
      events: [],
   };
}
