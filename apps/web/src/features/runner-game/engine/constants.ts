export const WORLD_HEIGHT = 50;
export const HEADROOM = 16;
export const GROUND_Y = 46;
export const LINE_THICKNESS = 3;

export const ROBOT_X = 20;
export const ROBOT_SIZE = 14;
export const ROBOT_GROUND_Y = GROUND_Y - ROBOT_SIZE;

export const IDLE_BUBBLE_GAP = 4;
export const IDLE_BUBBLE_DROP = 9;

export const SCALE_DESKTOP = 3;
export const SCALE_MOBILE = 2;
export const MOBILE_BREAKPOINT_PX = 768;

export const STEP = 1 / 120;
export const MAX_FRAME_DT = 0.05;
export const GRAVITY = 1000;
export const JUMP_VELOCITY = 160;
export const HOLD_ACCEL = 600;
export const MAX_HOLD = 0.22;

export const START_SPEED = 165;
export const MAX_SPEED = 300;
export const SPEED_ACCEL_EARLY = 0.85;
export const SPEED_ACCEL_LATE = 0.4;
export const ACCEL_SWITCH_TIME = 120;
export const MOBILE_SPEED_FACTOR = 0.85;
export const MOBILE_MAX_SPEED = 220;
export const MIN_LOOKAHEAD_TIME = 0.8;

export const JUMP_BUFFER = 0.1;
export const COYOTE_TIME = 0.05;

export const PAIR_GAP = 0.55;
export const DEADLINE_GAP = 1.1;
export const LOW_DEADLINE_GAP = 0.8;
export const DEADLINE_PICKUP_CLEAR = 1.2;
export const INTRO_GAP = 1.2;
export const PICKUP_GAP_MIN = 0.4;
export const PICKUP_GAP_SPREAD = 0.8;
export const SKILL_MIN_INTERVAL = 6;

export const BG_SPEED = 0.2;
export const BG_GAP_MIN = 55;
export const BG_GAP_SPREAD = 45;
export const BG_TOP = 12;
export const BG_BAND = 11;
export const BG_SYMBOLS = ['</>', '{ }', ';', '//', '=>', '[ ]', '( )', '#', '&&', '!='];
export const BG_SYMBOL_COUNT = BG_SYMBOLS.length;

export const SWEEP_TIME = 0.6;

export const MILESTONE_TIME = 3;

export const RUN_FRAME_TIME = 0.1;
export const BLINK_TIME = 0.5;
export const SHAKE_TIME = 0.18;
export const RESTART_COOLDOWN_MS = 600;
export const HUD_REFRESH_TIME = 0.1;

export const INTRO_DURATION_MS = 800;
export const INTRO_LINE_RATIO = 0.25;

export const BEST_TIME_KEY = 'mm-runner-best-time';
