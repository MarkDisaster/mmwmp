import { ROBOT_SIZE, ROBOT_X } from './constants';
import {
   COMMENT_FALL_TIME,
   COMMENT_TRIGGER_TIME,
   COMMENT_WARN_TIME,
   COOKIE_RISE_TIME,
   COOKIE_TRIGGER_TIME,
   COOKIE_WARN_TIME,
   DEADLINE_BOOST,
   DEADLINE_RANGE_TIME,
   isDeadline,
   LEAK_GROW_TIME,
   LEAK_TRIGGER_TIME,
   MERGE_TIME,
   MERGE_TRIGGER_TIME,
   MOBILE_TRIGGER_TIME,
   MOBILE_TURN_TIME,
   type Obstacle,
   type ObstacleKind,
   RESCHEDULE_MOVE_TIME,
   RESCHEDULE_SHAKE_TIME,
   RESCHEDULE_TRIGGER_TIME,
   SCOPE_GROW_TIME,
   SCOPE_TRIGGER_TIME,
   SPLIT_DISTANCE,
   SPLIT_SHAKE_TIME,
   SPLIT_SPEED,
   SPLIT_TRIGGER_TIME,
   widthOf,
} from './obstacles';
import { enterNextPhase, nextVersion } from './progress';
import { type GameState } from './state';

const advance = (value: number, dt: number, duration: number) => Math.min(1, value + dt / duration);

const TRANSFORMS: Partial<
   Record<ObstacleKind, (o: Obstacle, s: GameState, gap: number, dt: number) => void>
> = {
   patched: (o, s, gap, dt) => {
      if (gap >= s.entities.speed * SPLIT_TRIGGER_TIME) return;
      o.shake += dt;
      if (o.shake > SPLIT_SHAKE_TIME)
         o.split = Math.min(SPLIT_DISTANCE, o.split + SPLIT_SPEED * dt);
   },
   cookie: (o, s, gap, dt) => {
      o.warn = gap < s.entities.speed * (COOKIE_TRIGGER_TIME + COOKIE_WARN_TIME);
      if (gap < s.entities.speed * COOKIE_TRIGGER_TIME)
         o.rise = advance(o.rise, dt, COOKIE_RISE_TIME);
   },
   scopeCreep: (o, s, gap, dt) => {
      if (gap < s.entities.speed * SCOPE_TRIGGER_TIME)
         o.grow = advance(o.grow, dt, SCOPE_GROW_TIME);
   },
   merge: (o, s, gap, dt) => {
      if (gap < s.entities.speed * MERGE_TRIGGER_TIME) o.grow = advance(o.grow, dt, MERGE_TIME);
   },
   mobile: (o, s, gap, dt) => {
      if (gap < s.entities.speed * MOBILE_TRIGGER_TIME)
         o.grow = advance(o.grow, dt, MOBILE_TURN_TIME);
   },
   leak: (o, s, gap, dt) => {
      if (gap < s.entities.speed * LEAK_TRIGGER_TIME) o.grow = advance(o.grow, dt, LEAK_GROW_TIME);
   },
   reschedule: (o, s, gap, dt) => {
      if (!o.moves) return;
      o.shake = gap < s.entities.speed * RESCHEDULE_SHAKE_TIME ? o.shake + dt : 0;
      if (gap < s.entities.speed * RESCHEDULE_TRIGGER_TIME)
         o.grow = advance(o.grow, dt, RESCHEDULE_MOVE_TIME);
   },
   comment: (o, s, gap, dt) => {
      o.warn = o.grow === 0 && gap < s.entities.speed * COMMENT_WARN_TIME;
      if (gap < s.entities.speed * COMMENT_TRIGGER_TIME)
         o.grow = advance(o.grow, dt, COMMENT_FALL_TIME);
   },
};

export function updateObstacle(o: Obstacle, s: GameState, dt: number): void {
   const gap = o.x - (ROBOT_X + ROBOT_SIZE);
   let move = s.entities.speed * dt;
   if (isDeadline(o.kind)) {
      const range = s.entities.speed * DEADLINE_RANGE_TIME;
      const closeness = 1 - Math.min(1, Math.max(0, gap) / range);
      move *= 1 + DEADLINE_BOOST * closeness;
   }
   o.x -= move;
   TRANSFORMS[o.kind]?.(o, s, gap, dt);
   if (!o.passed && o.x + widthOf(o) < ROBOT_X) {
      o.passed = true;
      s.run.tally.obstacles++;
      if (o.endsPhase) enterNextPhase(s);
      if (o.endsWave) nextVersion(s);
   }
}
