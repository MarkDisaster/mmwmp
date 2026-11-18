import { describe, expect, it } from 'vitest';

import { ROBOT_GROUND_Y, STEP } from '../engine/constants';
import { step } from '../engine/engine';
import { fitsOnPlatform, type ObstacleKind } from '../engine/obstacles';
import { pressJump, releaseJump } from '../engine/physics';
import { type GameState, type World } from '../engine/state';
import { makeObstacle, quietRun, survives } from './helpers';

const run = (
   setup: (s: ReturnType<typeof quietRun>['s']) => void,
   plan: { pressAt?: number; hold?: number },
   seconds = 0,
) => {
   const { s, world } = quietRun(seconds);
   setup(s);
   return survives(s, world, plan, pressJump, releaseJump);
};

const passable = (setup: Parameters<typeof run>[0], hold: number, seconds = 0) => {
   for (let pressAt = 0; pressAt < 1.5; pressAt += 0.005) {
      if (run(setup, { pressAt, hold }, seconds)) return true;
   }
   return false;
};

const MIN_JUMP = 0;
const TAP = 0.02;
const HOLD = 0.22;

function twoJumps(s: GameState, world: World, first: number, second: number): boolean {
   const clock = s.run.tally.seconds;
   const presses = [first, second];
   let t = 0;
   let next = 0;
   let releaseAt = -1;
   for (let i = 0; i < 3 / STEP; i++) {
      if (next < presses.length && t >= presses[next]) {
         pressJump(s);
         releaseAt = t + HOLD;
         next++;
      }
      if (releaseAt >= 0 && t >= releaseAt) {
         releaseJump(s);
         releaseAt = -1;
      }
      step(s, STEP, world);
      s.run.tally.seconds = clock;
      t += STEP;
      if (s.run.gameOver) return false;
   }
   return true;
}

describe('pits', () => {
   it.each<[ObstacleKind, number]>([
      ['pit404', 0],
      ['pit500', 0],
      ['leak', 0],
      ['pit404', 250],
      ['pit500', 250],
   ])('%s swallows a robot that does not jump (at %i s)', (kind, seconds) => {
      expect(run((s) => s.entities.obstacles.push(makeObstacle(kind, 60)), {}, seconds)).toBe(
         false,
      );
   });

   it('can be jumped', () => {
      expect(passable((s) => s.entities.obstacles.push(makeObstacle('pit404', 200)), TAP)).toBe(
         true,
      );
   });
});

describe('bug lanes', () => {
   const bug = (lane: 0 | 1 | 2) => (s: ReturnType<typeof quietRun>['s']) =>
      s.entities.obstacles.push(makeObstacle('bug', 200, { lane }));

   it('on the line: running hits it, a tap clears it', () => {
      expect(run(bug(0), {})).toBe(false);
      expect(passable(bug(0), TAP)).toBe(true);
   });

   it('at head height: running hits it, the smallest jump is not enough, a held jump clears it', () => {
      expect(run(bug(1), {})).toBe(false);
      expect(passable(bug(1), MIN_JUMP)).toBe(false);
      expect(passable(bug(1), HOLD)).toBe(true);
   });

   it('overhead: the robot runs under it', () => {
      expect(run(bug(2), {})).toBe(true);
   });
});

describe('platforms', () => {
   const platform = (height: number) => (s: ReturnType<typeof quietRun>['s']) =>
      s.entities.obstacles.push(makeObstacle('platform', 200, { length: 120, height }));

   it('running into the edge ends the run', () => {
      expect(run(platform(10), {})).toBe(false);
      expect(run(platform(16), {})).toBe(false);
   });

   it('a low one takes a tap, a high one a held jump', () => {
      expect(passable(platform(10), TAP)).toBe(true);
      expect(passable(platform(16), MIN_JUMP)).toBe(false);
      expect(passable(platform(16), HOLD)).toBe(true);
   });

   it('a question bubble on a high platform, 0.4 s behind the edge, can be cleared', () => {
      expect(fitsOnPlatform('bug', { height: 16 })).toBe(true);
      let cleared = false;
      for (let first = 0.2; first < 1.2 && !cleared; first += 0.02) {
         for (let second = first + 0.15; second < first + 1 && !cleared; second += 0.02) {
            const { s, world } = quietRun(250);
            s.entities.obstacles.push(makeObstacle('platform', 200, { length: 200, height: 16 }));
            const x = 200 + s.entities.speed * 0.4;
            s.entities.obstacles.push(makeObstacle('bug', x, { skin: 'question', elev: 16 }));
            cleared = twoJumps(s, world, first, second);
         }
      }
      expect(cleared).toBe(true);
   });

   it('an enemy right behind a high edge can still be cleared after landing', () => {
      let cleared = false;
      for (let first = 0.2; first < 1.2 && !cleared; first += 0.02) {
         for (let second = first + 0.15; second < first + 1 && !cleared; second += 0.02) {
            const { s, world } = quietRun();
            s.entities.obstacles.push(makeObstacle('platform', 200, { length: 200, height: 16 }));
            s.entities.obstacles.push(
               makeObstacle('bug', 200 + s.entities.speed * 0.25, { elev: 16 }),
            );
            cleared = twoJumps(s, world, first, second);
         }
      }
      expect(cleared).toBe(true);
   });

   it('a late jump that reaches the edge with the feet just under the top still makes it', () => {
      const { s, world } = quietRun();
      s.entities.obstacles.push(makeObstacle('platform', 30, { length: 120, height: 10 }));
      s.robot.y = ROBOT_GROUND_Y - 10 + 2;
      s.robot.vy = -60;
      s.robot.grounded = false;
      expect(survives(s, world, {}, pressJump, releaseJump)).toBe(true);
   });

   it('dropping off the far end is safe', () => {
      const setup = (s: ReturnType<typeof quietRun>['s']) => {
         s.entities.obstacles.push(makeObstacle('platform', -40, { length: 80, height: 16 }));
         s.robot.y = ROBOT_GROUND_Y - 16;
      };
      expect(run(setup, {})).toBe(true);
   });
});
