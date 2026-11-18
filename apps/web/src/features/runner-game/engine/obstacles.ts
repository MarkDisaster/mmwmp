import { GROUND_Y, ROBOT_SIZE, ROBOT_X } from './constants';
import type { BugLane } from './phases';

export type ObstacleKind =
   | 'bug'
   | 'bugs'
   | 'semicolon'
   | 'pit404'
   | 'legacy'
   | 'pit500'
   | 'patched'
   | 'cookie'
   | 'deadline'
   | 'deadlineLow'
   | 'meeting'
   | 'scopeCreep'
   | 'merge'
   | 'mobile'
   | 'comment'
   | 'crowd'
   | 'leak'
   | 'reschedule'
   | 'platform';

export type Skin = ObstacleKind | 'question' | 'tbd' | 'update';

export type Obstacle = {
   kind: ObstacleKind;
   skin: Skin;
   x: number;
   prevX?: number;
   split: number;
   shake: number;
   rise: number;
   warn: boolean;
   grow: number;
   count: number;
   high: boolean;
   moves: boolean;
   lane: BugLane;
   length: number;
   height: number;
   elev: number;
   endsPhase: boolean;
   endsWave: boolean;
   passed: boolean;
};

export type Rect = { x: number; y: number; w: number; h: number };

type KindDef = {
   width: number;
   pit: boolean;
   dynamic: boolean;
};

export const KINDS: Record<ObstacleKind, KindDef> = {
   bug: { width: 10, pit: false, dynamic: false },
   bugs: { width: 22, pit: false, dynamic: false },
   semicolon: { width: 6, pit: false, dynamic: false },
   pit404: { width: 14, pit: true, dynamic: false },
   legacy: { width: 22, pit: false, dynamic: false },
   pit500: { width: 28, pit: true, dynamic: false },
   patched: { width: 26, pit: false, dynamic: true },
   cookie: { width: 20, pit: false, dynamic: false },
   deadlineLow: { width: 11, pit: false, dynamic: false },
   deadline: { width: 11, pit: false, dynamic: false },
   meeting: { width: 20, pit: false, dynamic: false },
   scopeCreep: { width: 12, pit: false, dynamic: true },
   merge: { width: 28, pit: false, dynamic: true },
   mobile: { width: 12, pit: false, dynamic: true },
   comment: { width: 9, pit: false, dynamic: true },
   crowd: { width: 23, pit: false, dynamic: false },
   leak: { width: 24, pit: true, dynamic: true },
   reschedule: { width: 11, pit: false, dynamic: true },
   platform: { width: 80, pit: false, dynamic: false },
};

const KIND_LIST = Object.keys(KINDS) as ObstacleKind[];
export const SKIN_LIST: Skin[] = [...KIND_LIST, 'question', 'tbd', 'update'];

export const SPLIT_DISTANCE = 16;
export const SPLIT_TRIGGER_TIME = 0.9;
export const SPLIT_SHAKE_TIME = 0.25;
export const SPLIT_SPEED = 80;
export const COOKIE_TRIGGER_TIME = 0.6;
export const COOKIE_WARN_TIME = 0.3;
export const COOKIE_RISE_TIME = 0.15;
export const COOKIE_HEIGHT = 9;
const DEADLINE_TOP = GROUND_Y - 26;
const DEADLINE_LOW_TOP = GROUND_Y - 12;
export const isDeadline = (kind: ObstacleKind) => kind === 'deadline' || kind === 'deadlineLow';
export const deadlineTop = (kind: ObstacleKind) =>
   kind === 'deadline' ? DEADLINE_TOP : DEADLINE_LOW_TOP;
export const DEADLINE_RANGE_TIME = 0.95;

const SCOPE_SMALL = 6;
export const SCOPE_LARGE = 12;
export const SCOPE_TRIGGER_TIME = 0.9;
export const SCOPE_GROW_TIME = 0.4;
export const MERGE_TRIGGER_TIME = 0.85;
export const MERGE_TIME = 0.4;
const MERGE_PILLAR = 4;
const MERGE_HEIGHT = 10;
export const MERGE_SHIFT = 8;
export const MOBILE_TRIGGER_TIME = 0.7;
export const MOBILE_TURN_TIME = 0.2;
export const COMMENT_WARN_TIME = 1.1;
export const COMMENT_TRIGGER_TIME = 0.7;
export const COMMENT_FALL_TIME = 0.25;
const COMMENT_HEIGHT = 5;
export const CROWD_STEP = 5;
const CROWD_HEIGHT = 5;
const LEAK_SMALL = 14;
const LEAK_LARGE = 24;
export const LEAK_TRIGGER_TIME = 1;
export const LEAK_GROW_TIME = 0.5;
export const RESCHEDULE_SHAKE_TIME = 1;
export const RESCHEDULE_TRIGGER_TIME = 0.8;
export const RESCHEDULE_MOVE_TIME = 0.2;

export const PLATFORM_HEIGHTS = [10, 16] as const;
const PLATFORM_EDGE_DEPTH = 4;
export const PLATFORM_MIN = 90;
export const PLATFORM_MAX = 220;
const PLATFORM_KINDS: readonly ObstacleKind[] = [
   'bug',
   'bugs',
   'semicolon',
   'legacy',
   'meeting',
   'scopeCreep',
   'comment',
   'crowd',
];
const HIGH_PLATFORM_KINDS: readonly ObstacleKind[] = ['bug', 'bugs', 'comment', 'crowd'];

export const fitsOnPlatform = (kind: ObstacleKind, platform: Pick<Obstacle, 'height'>) =>
   (platform.height > PLATFORM_HEIGHTS[0] ? HIGH_PLATFORM_KINDS : PLATFORM_KINDS).includes(kind);

export const widthOf = (o: Pick<Obstacle, 'kind' | 'length'>) =>
   o.kind === 'platform' ? o.length : KINDS[o.kind].width;

export const pitWidth = (o: Obstacle) =>
   o.kind === 'leak' ? LEAK_SMALL + (LEAK_LARGE - LEAK_SMALL) * o.grow : KINDS[o.kind].width;

export function rescheduleTop(o: Obstacle): number {
   const [from, to] = o.high ? [DEADLINE_TOP, DEADLINE_LOW_TOP] : [DEADLINE_LOW_TOP, DEADLINE_TOP];
   return from + (to - from) * o.grow;
}
export const DEADLINE_BOOST = 0.5;

const BUG_HEIGHT = 7;

export const LANES: Partial<Record<ObstacleKind, readonly BugLane[]>> = {
   bug: [0, 1, 2],
   bugs: [0, 2],
   meeting: [0, 2],
};
const LANE_LIFT: Partial<Record<ObstacleKind, readonly [number, number, number]>> = {
   bug: [0, 6, 19],
   bugs: [0, 0, 19],
   meeting: [0, 0, 15],
};
const QUESTION_LIFT = [0, 6, 14] as const;

export function laneLift(o: Pick<Obstacle, 'kind' | 'skin' | 'lane'>): number {
   if (!o.lane) return 0;
   if (o.skin === 'question') return QUESTION_LIFT[o.lane];
   return LANE_LIFT[o.kind]?.[o.lane] ?? 0;
}

const bugRect = (x: number): Rect => ({ x: x + 1, y: GROUND_Y - 6, w: 8, h: 6 });

export function obstacleRects(o: Obstacle): Rect[] {
   const lift = o.elev + laneLift(o);
   const rects = groundRects(o);
   return lift ? rects.map((r) => ({ ...r, y: r.y - lift })) : rects;
}

function groundRects(o: Obstacle): Rect[] {
   switch (o.kind) {
      case 'bug':
         return o.skin === 'question'
            ? [{ x: o.x, y: GROUND_Y - 10, w: 10, h: 7 }]
            : [bugRect(o.x)];
      case 'bugs':
         return [bugRect(o.x), bugRect(o.x + 12)];
      case 'patched':
         return o.split > 0 ? [bugRect(o.x), bugRect(o.x + o.split)] : [bugRect(o.x)];
      case 'semicolon':
         return [{ x: o.x + 1, y: GROUND_Y - 14, w: 5, h: 14 }];
      case 'legacy':
         return [{ x: o.x, y: GROUND_Y - BUG_HEIGHT, w: 22, h: BUG_HEIGHT }];
      case 'cookie':
         return o.rise > 0.3
            ? [{ x: o.x, y: GROUND_Y - COOKIE_HEIGHT * o.rise, w: 20, h: COOKIE_HEIGHT * o.rise }]
            : [];
      case 'deadline':
      case 'deadlineLow':
         return [{ x: o.x + 1, y: deadlineTop(o.kind) + 1, w: 9, h: 8 }];
      case 'meeting':
         return [
            { x: o.x + 1, y: GROUND_Y - 7, w: 7, h: 5 },
            { x: o.x + 12, y: GROUND_Y - 9, w: 7, h: 5 },
         ];
      case 'scopeCreep': {
         const size = scopeSize(o);
         const left = o.x + (SCOPE_LARGE - size) / 2;
         return [{ x: left + 1, y: GROUND_Y - size, w: size - 2, h: size }];
      }
      case 'merge': {
         const shift = MERGE_SHIFT * o.grow;
         const right = o.x + KINDS.merge.width - MERGE_PILLAR - shift;
         return [
            { x: o.x + shift, y: GROUND_Y - MERGE_HEIGHT, w: MERGE_PILLAR, h: MERGE_HEIGHT },
            { x: right, y: GROUND_Y - MERGE_HEIGHT, w: MERGE_PILLAR, h: MERGE_HEIGHT },
         ];
      }
      case 'mobile':
         return o.grow < 0.5
            ? [{ x: o.x + 4, y: GROUND_Y - 12, w: 5, h: 12 }]
            : [{ x: o.x + 1, y: GROUND_Y - 7, w: 10, h: 7 }];
      case 'comment':
         return o.grow >= 1
            ? [{ x: o.x + 1, y: GROUND_Y - COMMENT_HEIGHT, w: 7, h: COMMENT_HEIGHT }]
            : [];
      case 'crowd':
         return Array.from({ length: o.count }, (_, i) => ({
            x: o.x + i * CROWD_STEP,
            y: GROUND_Y - CROWD_HEIGHT,
            w: 3,
            h: CROWD_HEIGHT,
         }));
      case 'reschedule':
         return [{ x: o.x + 1, y: rescheduleTop(o) + 1, w: 9, h: 8 }];
      case 'platform':
         return [{ x: o.x, y: GROUND_Y - o.height, w: PLATFORM_EDGE_DEPTH, h: o.height }];
      case 'pit404':
      case 'pit500':
      case 'leak':
         return [];
   }
}

export const scopeSize = (o: Obstacle) =>
   Math.round(SCOPE_SMALL + (SCOPE_LARGE - SCOPE_SMALL) * o.grow);

export function robotRects(y: number): Rect[] {
   return [
      { x: ROBOT_X + 1, y: y + 1, w: 12, h: 5 },
      { x: ROBOT_X + 3, y: y + 8, w: 8, h: ROBOT_SIZE - 8 },
   ];
}

export function overlaps(a: Rect, b: Rect): boolean {
   return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
