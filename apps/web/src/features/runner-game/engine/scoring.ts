import { ROBOT_X } from './constants';
import { overlaps, type Rect } from './obstacles';
import { PICKUPS } from './pickups';
import { type GameState, type Tally } from './state';

export function scoreOf(t: Tally): number {
   return Math.floor(t.seconds) + t.obstacles + t.points;
}

export function collectPickups(s: GameState, dt: number): void {
   const box: Rect = { x: ROBOT_X + 1, y: s.robot.y + 1, w: 12, h: 13 };
   for (const p of s.entities.pickups) {
      p.x -= s.entities.speed * dt;
      const { w, h, points } = PICKUPS[p.kind];
      if (p.taken || !overlaps(box, { x: p.x, y: p.y, w, h })) continue;
      p.taken = true;
      s.run.tally.points += points;
      s.events.push({
         type: 'collected',
         pickup: p.kind,
         x: p.x + w / 2,
         y: p.y - 2,
         points,
         label: p.label,
      });
   }
   s.entities.pickups = s.entities.pickups.filter((p) => !p.taken && p.x > -30);
}
