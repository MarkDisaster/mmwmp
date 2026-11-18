import { GRAVITY, GROUND_Y, ROBOT_GROUND_Y } from './constants';
import { spawn, spawnPlatforms } from './director';
import { updateObstacle } from './obstacleMotion';
import { widthOf } from './obstacles';
import { checkHits, updateRobot } from './physics';
import { spawnPickups } from './pickupPlacement';
import { phaseClock, speedFor } from './progress';
import { collectPickups, scoreOf } from './scoring';
import { type GameState, type World } from './state';

export function beginRun(s: GameState): void {
   s.run.started = true;
   s.events.push({ type: 'phaseEntered', phase: 'planning' });
}

export function step(s: GameState, dt: number, world: World): void {
   s.events.length = 0;
   rememberPositions(s);
   s.entities.speed = speedFor(phaseClock(s, world), world);
   s.run.clock = phaseClock(s, world);
   s.run.celebrate = Math.max(0, s.run.celebrate - dt);

   updateRobot(s, dt);
   s.entities.obstacles.forEach((o) => updateObstacle(o, s, dt));
   s.entities.obstacles = s.entities.obstacles.filter((o) => o.x + widthOf(o) > -20);

   s.director.spawnIn -= s.entities.speed * dt;
   spawnPlatforms(s, world, dt);
   spawnPickups(s, world, dt);
   if (s.director.spawnIn <= 0) spawn(s, world);

   collectPickups(s, dt);
   if (!s.run.gameOver) checkHits(s);

   s.run.tally.seconds += dt;
   s.run.score = scoreOf(s.run.tally);
}

function rememberPositions(s: GameState): void {
   s.robot.prevY = s.robot.y;
   for (const o of s.entities.obstacles) o.prevX = o.x;
   for (const p of s.entities.pickups) p.prevX = p.x;
}

export function stepGameOver(s: GameState, dt: number): void {
   if (s.robot.y <= ROBOT_GROUND_Y) return;
   s.robot.vy += GRAVITY * dt;
   s.robot.y = Math.min(s.robot.y + s.robot.vy * dt, GROUND_Y + 20);
}
