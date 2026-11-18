import {
   COYOTE_TIME,
   GRAVITY,
   GROUND_Y,
   HEADROOM,
   HOLD_ACCEL,
   JUMP_BUFFER,
   JUMP_VELOCITY,
   MAX_HOLD,
   ROBOT_GROUND_Y,
   ROBOT_SIZE,
   ROBOT_X,
} from './constants';
import { KINDS, type Obstacle, obstacleRects, overlaps, pitWidth, robotRects } from './obstacles';
import { type GameState } from './state';

function jump(s: GameState): void {
   s.robot.vy = -JUMP_VELOCITY;
   s.robot.holding = s.robot.keyHeld;
   s.robot.holdTime = 0;
   s.robot.grounded = false;
   s.robot.jumpBuffer = 0;
   s.robot.overPit = 0;
   s.events.push({ type: 'jumped' });
}

export function pressJump(s: GameState): void {
   s.robot.keyHeld = true;
   if (s.robot.grounded) jump(s);
   else s.robot.jumpBuffer = JUMP_BUFFER;
}

export function releaseJump(s: GameState): void {
   s.robot.keyHeld = false;
   s.robot.holding = false;
}

const CEILING = -HEADROOM;

const FEET_LEFT = ROBOT_X + 4;

const FEET_RIGHT = ROBOT_X + 11;

const LEDGE_ASSIST = 3;

function floorUnderRobot(s: GameState): number {
   const platform = s.entities.obstacles.find(
      (o) => o.kind === 'platform' && FEET_RIGHT > o.x && FEET_LEFT < o.x + o.length,
   );
   return ROBOT_GROUND_Y - (platform?.height ?? 0);
}

export const platformAt = (s: GameState, x: number) =>
   s.entities.obstacles.find((o) => o.kind === 'platform' && x >= o.x && x <= o.x + o.length);

function pitUnderRobot(s: GameState): Obstacle | undefined {
   const center = ROBOT_X + ROBOT_SIZE / 2;
   return s.entities.obstacles.find((o) => {
      const def = KINDS[o.kind];
      return def.pit && center > o.x + 3 && center < o.x + pitWidth(o) - 3;
   });
}

function die(s: GameState, killer: Obstacle): void {
   s.run.gameOver = true;
   s.run.cause = killer.skin;
   s.run.killer = killer;
   s.events.push({ type: 'died', cause: killer.skin });
}

function fallInto(s: GameState, pit: Obstacle): void {
   die(s, pit);
   s.robot.grounded = false;
   s.robot.y = Math.max(s.robot.y, ROBOT_GROUND_Y + 0.5);
}

export function updateRobot(s: GameState, dt: number): void {
   if (s.robot.holding && s.robot.vy < 0 && s.robot.holdTime < MAX_HOLD) {
      s.robot.vy -= HOLD_ACCEL * dt;
      s.robot.holdTime += dt;
   }
   s.robot.jumpBuffer = Math.max(0, s.robot.jumpBuffer - dt);
   const floor = floorUnderRobot(s);
   const pit = floor === ROBOT_GROUND_Y ? pitUnderRobot(s) : undefined;
   if (s.robot.grounded) {
      if (s.robot.y < floor) {
         s.robot.grounded = false;
         s.robot.vy = 0;
         return;
      }
      s.robot.overPit = pit ? s.robot.overPit + dt : 0;
      const pastMiddle = pit && ROBOT_X + ROBOT_SIZE / 2 > pit.x + pitWidth(pit) / 2;
      if (pit && (s.robot.overPit > COYOTE_TIME || pastMiddle)) fallInto(s, pit);
      return;
   }

   const before = s.robot.y;
   fly(s, dt);
   const descending = s.robot.vy > 0;
   if (
      s.robot.y >= floor &&
      (before <= floor + 0.5 || (descending && s.robot.y <= floor + LEDGE_ASSIST))
   )
      land(s, floor, pit);
}

function fly(s: GameState, dt: number): void {
   s.robot.vy += GRAVITY * dt;
   s.robot.y += s.robot.vy * dt;
   if (s.robot.y < CEILING) {
      s.robot.y = CEILING;
      s.robot.vy = Math.max(0, s.robot.vy);
   }
}

function land(s: GameState, floor: number, pit: Obstacle | undefined): void {
   if (pit) {
      fallInto(s, pit);
      return;
   }
   s.events.push({ type: 'landed', hard: s.robot.vy > JUMP_VELOCITY * 0.8 });
   s.robot.y = floor;
   s.robot.vy = 0;
   s.robot.grounded = true;
   if (s.robot.jumpBuffer > 0) jump(s);
}

const clearsEdge = (s: GameState, o: Obstacle) =>
   o.kind === 'platform' && s.robot.y + ROBOT_SIZE <= GROUND_Y - o.height + LEDGE_ASSIST;

export function checkHits(s: GameState): void {
   const robot = robotRects(s.robot.y);
   for (const o of s.entities.obstacles) {
      if (clearsEdge(s, o)) continue;
      const rects = obstacleRects(o);
      if (rects.some((r) => robot.some((p) => overlaps(p, r)))) {
         die(s, o);
         return;
      }
   }
}
