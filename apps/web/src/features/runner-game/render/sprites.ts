export type Sprite = readonly string[];

const ROBOT_FRAME_TOP = '.############.';
const ROBOT_SCREEN_EDGE = '#............#';
const ROBOT_CHIN = '.##########B#.';
const ROBOT_NECK = '......##......';
const ROBOT_SHOULDERS = '..##########..';
const ROBOT_ARMS = '..#.######.#..';
const ROBOT_TORSO = '....######....';

const robotHead = (screen: readonly string[]): string[] => [
   ROBOT_FRAME_TOP,
   ...screen,
   ROBOT_CHIN,
   ROBOT_NECK,
];

const PROMPT_TOP = '#.B..........#';
const PROMPT_MIDDLE = '#..B.........#';
const SCREEN_PROMPT = [
   ROBOT_SCREEN_EDGE,
   PROMPT_TOP,
   PROMPT_MIDDLE,
   '#.B..BBB.....#',
   ROBOT_SCREEN_EDGE,
];
const SCREEN_PROMPT_BLINK = [
   ROBOT_SCREEN_EDGE,
   PROMPT_TOP,
   PROMPT_MIDDLE,
   PROMPT_TOP,
   ROBOT_SCREEN_EDGE,
];
const SCREEN_HAPPY = [
   ROBOT_SCREEN_EDGE,
   '#...B.....B..#',
   '#..B.B...B.B.#',
   ROBOT_SCREEN_EDGE,
   ROBOT_SCREEN_EDGE,
];
const SCREEN_BSOD = [
   '#BBBBBBBBBBBB#',
   '#BBBPBBBBPBBB#',
   '#BBBBBBBBBBBB#',
   '#BBBBPPPPBBBB#',
   '#BBBPBBBBPBBB#',
];

const LEGS_IDLE = ['....#....#....', '...##....##...'];
const BODY_IDLE = [ROBOT_SHOULDERS, ROBOT_ARMS, ROBOT_ARMS, ROBOT_TORSO, ...LEGS_IDLE];

export const ROBOT_IDLE: Sprite = [...robotHead(SCREEN_PROMPT), ...BODY_IDLE];
export const ROBOT_BLINK: Sprite = [...robotHead(SCREEN_PROMPT_BLINK), ...BODY_IDLE];
export const ROBOT_RUN_A: Sprite = [
   ...robotHead(SCREEN_PROMPT),
   ROBOT_SHOULDERS,
   ROBOT_ARMS,
   '..#.######....',
   '.....#...#....',
   '.....#....#...',
   '.....##.......',
];
export const ROBOT_RUN_B: Sprite = [
   ...robotHead(SCREEN_PROMPT),
   ROBOT_SHOULDERS,
   ROBOT_ARMS,
   '....######.#..',
   '.....#...#....',
   '....#....#....',
   '.........##...',
];
export const ROBOT_JUMP: Sprite = [
   ...robotHead(SCREEN_HAPPY),
   '#............#',
   '.############.',
   ROBOT_TORSO,
   ROBOT_TORSO,
   '...#......#...',
   '..##......##..',
];
export const ROBOT_BSOD: Sprite = [...robotHead(SCREEN_BSOD), ...BODY_IDLE];

const BUG_ANTENNAE = ['.#......#.', '..#....#..'];
const BUG_BODY = ['..######..', '###.##.###', '..######..'];
const BUG_LEGS_A = ['.#.#..#.#.', '#..#..#..#'];
const BUG_LEGS_B = ['#..#..#..#', '.#.#..#.#.'];

export const BUG_A: Sprite = [...BUG_ANTENNAE, ...BUG_BODY, ...BUG_LEGS_A];
export const BUG_B: Sprite = [...BUG_ANTENNAE, ...BUG_BODY, ...BUG_LEGS_B];
export const BUG_FLY_A: Sprite = ['##.#..#.##', '.##....##.', ...BUG_BODY];
export const BUG_FLY_B: Sprite = [...BUG_ANTENNAE, ...BUG_BODY, '##......##'];

export const BUG_PATCHED: Sprite = [
   ...BUG_ANTENNAE,
   '..#.##.#..',
   '####..####',
   '..#.##.#..',
   ...BUG_LEGS_A,
];

export const SEMICOLON: Sprite = [
   '..####',
   '..####',
   '..####',
   '......',
   '......',
   '......',
   '......',
   '..####',
   '..####',
   '..####',
   '...###',
   '...##.',
   '..##..',
   '.##...',
];

export const QUESTION: Sprite = [
   '..########..',
   '.##########.',
   '####....####',
   '###.####.###',
   '########.###',
   '#######.####',
   '######.#####',
   '############',
   '######.#####',
   '.##########.',
   '..##........',
];

const BUBBLE_EDGE = '.#######.';
const BUBBLE_FULL = '#########';
const BUBBLE_DOTS = '##.#.#.##';
const BUBBLE_NONE = '.........';
const meetingRow = (left: string, right: string) => `${left}..${right}`;
export const MEETING: Sprite = [
   meetingRow(BUBBLE_NONE, BUBBLE_EDGE),
   meetingRow(BUBBLE_NONE, BUBBLE_FULL),
   meetingRow(BUBBLE_EDGE, BUBBLE_DOTS),
   meetingRow(BUBBLE_FULL, BUBBLE_FULL),
   meetingRow(BUBBLE_DOTS, BUBBLE_EDGE),
   meetingRow(BUBBLE_FULL, '.....##..'),
   meetingRow(BUBBLE_EDGE, BUBBLE_NONE),
   meetingRow('.##......', BUBBLE_NONE),
];

const SMALL_EDGE = '######';
const SMALL_BRACE = '#.##.#';
export const SCOPE_SMALL_BOX: Sprite = [
   SMALL_EDGE,
   '##..##',
   SMALL_BRACE,
   SMALL_BRACE,
   '##..##',
   SMALL_EDGE,
];
const BOX_EDGE = '############';
const BOX_EMPTY = '#..........#';
const BRACE_END = '#..##..##..#';
const BRACE_SIDE = '#..#....#..#';
const BRACE_TIP = '#.##....##.#';
export const SCOPE_LARGE_BOX: Sprite = [
   BOX_EDGE,
   BOX_EMPTY,
   BRACE_END,
   BRACE_SIDE,
   BRACE_SIDE,
   BRACE_TIP,
   BRACE_TIP,
   BRACE_SIDE,
   BRACE_SIDE,
   BRACE_END,
   BOX_EMPTY,
   BOX_EDGE,
];

const PILLAR = '####';
export const MERGE_LEFT: Sprite = [
   PILLAR,
   PILLAR,
   '##.#',
   '#.##',
   '.###',
   '#.##',
   '##.#',
   PILLAR,
   PILLAR,
   PILLAR,
];
export const MERGE_RIGHT: Sprite = MERGE_LEFT.map((row) => [...row].reverse().join(''));
const MERGED_LINE = '#.#.#.#.#.##';
export const MERGED: Sprite = [
   BOX_EDGE,
   BOX_EDGE,
   MERGED_LINE,
   BOX_EDGE,
   MERGED_LINE,
   BOX_EDGE,
   MERGED_LINE,
   BOX_EDGE,
   BOX_EDGE,
   BOX_EDGE,
];

const WALL_MORTAR = '######################';
export const LEGACY_WALL: Sprite = [
   WALL_MORTAR,
   '#....#.....#.....#...#',
   WALL_MORTAR,
   '#..#.....#.....#.....#',
   WALL_MORTAR,
   '#....#.....#.....#...#',
   WALL_MORTAR,
];

const CLOCK_SHOULDER = '.##.....##.';
export const CLOCK: Sprite = [
   '...#####...',
   CLOCK_SHOULDER,
   '.#...#...#.',
   '#....#....#',
   '#....#....#',
   '#....###..#',
   '#.........#',
   '.#.......#.',
   CLOCK_SHOULDER,
   '...#####...',
];

export const COMMIT: Sprite = ['..B..', '.BBB.', 'BBPBB', '.BBB.', '..B..'];

export const REVIEW: Sprite = ['BBBBBBB', 'BBBBBPB', 'BBBBPBB', 'BPBPBBB', 'BBPBBBB', 'BBBBBBB'];

export const ROCKET: Sprite = [
   '...B...',
   '..BBB..',
   '..BPB..',
   '..BBB..',
   '.BBBBB.',
   'B.BBB.B',
   '..B.B..',
   '...P...',
   '..P.P..',
];

export const FEEDBACK: Sprite = ['BBBBBBB', 'BPBPBPB', 'BBBBBBB', '.BB....'];

export const PHONE_UPRIGHT: Sprite = [
   '#######',
   '#.....#',
   '#.....#',
   '#.....#',
   '#.....#',
   '#.....#',
   '#.....#',
   '#.....#',
   '#.....#',
   '#######',
   '###.###',
   '#######',
];
const PHONE_BUTTON = '#........#.#';
const PHONE_SIDE = '#........###';
export const PHONE_LYING: Sprite = [
   BOX_EDGE,
   PHONE_BUTTON,
   PHONE_SIDE,
   PHONE_BUTTON,
   PHONE_SIDE,
   PHONE_BUTTON,
   BOX_EDGE,
];

export const COMMENT: Sprite = ['#########', '####.##.#', '###.##.##', '##.##.###', '#########'];
export const COMMENT_WARNING: Sprite = ['##', '##', '##', '..', '##'];

export const PERSON: Sprite = ['.#.', '###', '.#.', '#.#', '#.#'];

const UPDATE_SOLID = '##########';

export const UPDATE: Sprite = [
   UPDATE_SOLID,
   '#.#.######',
   UPDATE_SOLID,
   UPDATE_SOLID,
   '#####....#',
   UPDATE_SOLID,
   UPDATE_SOLID,
];

export const ROBOT_HAPPY_A: Sprite = [...robotHead(SCREEN_HAPPY), ...ROBOT_RUN_A.slice(8)];
export const ROBOT_HAPPY_B: Sprite = [...robotHead(SCREEN_HAPPY), ...ROBOT_RUN_B.slice(8)];

const PAGE_SOLID = '###########';
const PAGE_DAYS = '#.#.#.#.#.#';
export const CALENDAR: Sprite = [
   CLOCK_SHOULDER,
   PAGE_SOLID,
   PAGE_SOLID,
   PAGE_DAYS,
   PAGE_SOLID,
   PAGE_DAYS,
   PAGE_SOLID,
   '#.#.#.#.###',
   PAGE_SOLID,
   PAGE_SOLID,
];

export const DOCS: Sprite = [
   'BBBBB..',
   'BPPPBB.',
   'BBBBBBB',
   'BPPPPPB',
   'BBBBBBB',
   'BPPPPPB',
   'BBBBBBB',
   'BBBBBBB',
];
