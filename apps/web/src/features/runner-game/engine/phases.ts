import type { ObstacleKind, Skin } from './obstacles';
import type { Random } from './rng';

export type PhaseId = 'planning' | 'development' | 'testing' | 'launch' | 'maintenance';

export type Reward = 'review' | 'deploy';

type ScriptStep = {
   kind: ObstacleKind;
   gap?: number;
   reward?: Reward;
   drops?: boolean;
   lane?: BugLane;
};

export type BugLane = 0 | 1 | 2;

type PhaseEvent = { at: number; steps: ScriptStep[] };

type Ramp = [from: number, to: number];

export type Phase = {
   id: PhaseId;
   start: number;
   rampEnd: number;
   gapBase: Ramp;
   gapSpread: Ramp;
   pair: Ramp;
   triple: Ramp;
   weights: Partial<Record<ObstacleKind, number>>;
   platformGap: Ramp;
   lanes: [low: number, middle: number, high: number];
   debuts: PhaseEvent[];
   finale: PhaseEvent | null;
};

const FINALE_GAP = 0.9;

const LATE_WEIGHTS: Partial<Record<ObstacleKind, number>> = {
   bug: 1.6,
   pit404: 0.8,
   meeting: 0.8,
   bugs: 1.6,
   semicolon: 1.6,
   legacy: 1.6,
   scopeCreep: 0.8,
   merge: 0.8,
   pit500: 1.6,
   patched: 1.6,
   mobile: 1.6,
   comment: 1.6,
   cookie: 2,
   deadlineLow: 2,
   deadline: 2,
};

export const PHASES: Phase[] = [
   {
      id: 'planning',
      platformGap: [2.5, 4.5],
      lanes: [0.6, 0.25, 0.15],
      start: 0,
      rampEnd: 20,
      gapBase: [0.7, 0.62],
      gapSpread: [0.3, 0.3],
      pair: [0.1, 0.25],
      triple: [0, 0.05],
      weights: { bug: 5, pit404: 3, meeting: 3 },
      debuts: [
         { at: 3, steps: [{ kind: 'pit404' }] },
         { at: 8, steps: [{ kind: 'meeting' }] },
      ],
      finale: {
         at: 18,
         steps: [
            { kind: 'bug' },
            { kind: 'pit404', gap: FINALE_GAP },
            { kind: 'meeting', gap: FINALE_GAP, reward: 'review' },
         ],
      },
   },
   {
      id: 'development',
      platformGap: [2, 4],
      lanes: [0.5, 0.3, 0.2],
      start: 20,
      rampEnd: 50,
      gapBase: [0.62, 0.58],
      gapSpread: [0.28, 0.28],
      pair: [0.25, 0.35],
      triple: [0.05, 0.1],
      weights: {
         bug: 3,
         pit404: 2,
         meeting: 2,
         bugs: 2,
         semicolon: 2,
         legacy: 2,
         scopeCreep: 2,
         merge: 1,
      },
      debuts: [
         { at: 20, steps: [{ kind: 'bug' }] },
         { at: 22, steps: [{ kind: 'bugs' }] },
         { at: 25, steps: [{ kind: 'semicolon' }] },
         { at: 28, steps: [{ kind: 'legacy' }] },
         { at: 30, steps: [{ kind: 'scopeCreep' }] },
         { at: 38, steps: [{ kind: 'merge' }] },
      ],
      finale: {
         at: 47,
         steps: [
            { kind: 'merge' },
            { kind: 'legacy', gap: FINALE_GAP },
            { kind: 'semicolon', gap: FINALE_GAP, reward: 'review' },
         ],
      },
   },
   {
      id: 'testing',
      platformGap: [1.6, 3.2],
      lanes: [0.45, 0.3, 0.25],
      start: 50,
      rampEnd: 85,
      gapBase: [0.58, 0.55],
      gapSpread: [0.25, 0.25],
      pair: [0.35, 0.45],
      triple: [0.1, 0.15],
      weights: {
         bug: 2,
         pit404: 1,
         meeting: 1,
         bugs: 2,
         semicolon: 2,
         legacy: 2,
         scopeCreep: 1,
         merge: 1,
         pit500: 2,
         patched: 2,
         mobile: 2,
         comment: 2,
      },
      debuts: [
         { at: 51, steps: [{ kind: 'pit404' }, { kind: 'pit500', gap: FINALE_GAP }] },
         { at: 56, steps: [{ kind: 'patched' }] },
         { at: 62, steps: [{ kind: 'mobile' }] },
         { at: 68, steps: [{ kind: 'comment' }] },
      ],
      finale: {
         at: 82,
         steps: [
            { kind: 'bug' },
            { kind: 'patched', gap: 0.8 },
            { kind: 'mobile', gap: 0.8 },
            { kind: 'bugs', gap: 0.8 },
         ],
      },
   },
   {
      id: 'launch',
      platformGap: [1.5, 3],
      lanes: [0.4, 0.3, 0.3],
      start: 85,
      rampEnd: 120,
      gapBase: [0.55, 0.52],
      gapSpread: [0.25, 0.22],
      pair: [0.45, 0.5],
      triple: [0.15, 0.2],
      weights: { ...LATE_WEIGHTS, crowd: 1, reschedule: 1 },
      debuts: [
         { at: 87, steps: [{ kind: 'cookie' }] },
         { at: 91, steps: [{ kind: 'deadlineLow' }] },
         { at: 96, steps: [{ kind: 'deadline' }] },
         { at: 100, steps: [{ kind: 'crowd' }] },
         { at: 106, steps: [{ kind: 'reschedule', drops: true }] },
      ],
      finale: {
         at: 115,
         steps: [
            { kind: 'reschedule', drops: false },
            { kind: 'pit500', gap: 1.1, reward: 'deploy' },
            { kind: 'deadlineLow', gap: FINALE_GAP },
            { kind: 'crowd', gap: FINALE_GAP },
         ],
      },
   },
   {
      id: 'maintenance',
      platformGap: [1.2, 2.5],
      lanes: [0.35, 0.3, 0.35],
      start: 122.5,
      rampEnd: 300,
      gapBase: [0.5, 0.45],
      gapSpread: [0.2, 0.18],
      pair: [0.5, 0.6],
      triple: [0.2, 0.3],
      weights: { ...LATE_WEIGHTS, crowd: 1, reschedule: 1.5, leak: 2 },
      debuts: [],
      finale: null,
   },
];

export const PHASE_CALM = 1.5;
export const DELIVERY_CALM = 2.5;
export const DELIVERY_BONUS = 25;
export const WAVE_INTERVAL = 60;
export const WAVE_LENGTH = 5;
export const WAVE_CALM = 2;
export const VERSION_TWO_AT = 300;
export const VETERAN_TIME = 60;
export const VETERAN_SHIFT = 10;

export function skinFor(kind: ObstacleKind, phase: PhaseId, random: Random): Skin {
   if (kind === 'bug' && phase === 'planning') return 'question';
   if (kind === 'pit404' && (phase === 'planning' || phase === 'development')) return 'tbd';
   if (kind === 'bug' && phase === 'maintenance' && random() < 0.5) return 'update';
   return kind;
}
