import {
   BG_BAND,
   BG_GAP_MIN,
   BG_GAP_SPREAD,
   BG_SPEED,
   BG_SYMBOL_COUNT,
   BG_TOP,
   GROUND_Y,
   MILESTONE_TIME,
   ROBOT_X,
   SHAKE_TIME,
   SWEEP_TIME,
} from '../engine/constants';
import type { PickupKind } from '../engine/pickups';
import { type GameEvent, type MilestoneKind, versionLabel, type World } from '../engine/state';

type Particle = { x: number; y: number; vx: number; vy: number; life: number };
type Popup = {
   x: number;
   y: number;
   life: number;
   text: string;
   brand?: boolean;
   delivered?: boolean;
   pickup?: PickupKind;
   label?: string;
};
type Milestone = { kind: MilestoneKind; life: number; version: string };
type BgSymbol = { x: number; prevX?: number; y: number; symbol: number };

export type Effects = {
   particles: Particle[];
   popups: Popup[];
   shake: number;
   sweep: number;
   milestone: Milestone | null;
   animTime: number;
   background: BgSymbol[];
   backgroundIn: number;
};

export function createEffects(): Effects {
   return {
      particles: [],
      popups: [],
      shake: 0,
      sweep: 0,
      milestone: null,
      animTime: 0,
      background: [],
      backgroundIn: 0,
   };
}

function dust(fx: Effects, count: number): void {
   for (let i = 0; i < count; i++) {
      fx.particles.push({
         x: ROBOT_X + 4 + Math.random() * 4,
         y: GROUND_Y - 1,
         vx: -20 - Math.random() * 40,
         vy: -10 - Math.random() * 25,
         life: 0.35,
      });
   }
}

const milestone = (kind: MilestoneKind, version = ''): Milestone => ({
   kind,
   life: MILESTONE_TIME,
   version,
});

export function applyEvents(fx: Effects, events: readonly GameEvent[]): void {
   for (const event of events) {
      switch (event.type) {
         case 'jumped':
            dust(fx, 3);
            break;
         case 'landed':
            if (event.hard) dust(fx, 3);
            break;
         case 'died':
            fx.shake = SHAKE_TIME;
            break;
         case 'collected':
            fx.popups.push({
               x: event.x,
               y: event.y,
               life: 0.6,
               text: `+${event.points}`,
               pickup: event.pickup,
               label: event.label,
            });
            break;
         case 'phaseEntered':
            fx.milestone = milestone(event.phase);
            break;
         case 'delivered':
            fx.milestone = milestone('delivered');
            fx.sweep = SWEEP_TIME;
            fx.popups.push({
               x: ROBOT_X + 7,
               y: event.y - 4,
               life: 1.2,
               text: `+${event.bonus}`,
               delivered: true,
               brand: true,
            });
            break;
         case 'versionReleased':
            fx.milestone = milestone(
               event.version.minor === 0 ? 'version' : 'maintenance',
               versionLabel(event.version),
            );
            break;
      }
   }
}

export function advanceGameTime(fx: Effects, dt: number): void {
   fx.animTime += dt;
   fx.sweep = Math.max(0, fx.sweep - dt);
   if (fx.milestone) {
      fx.milestone.life -= dt;
      if (fx.milestone.life <= 0) fx.milestone = null;
   }
}

export function advanceRealTime(fx: Effects, dt: number): void {
   fx.shake = Math.max(0, fx.shake - dt);
   for (const p of fx.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
   }
   fx.particles = fx.particles.filter((p) => p.life > 0);
   for (const p of fx.popups) {
      p.y -= 12 * dt;
      p.life -= dt;
   }
   fx.popups = fx.popups.filter((p) => p.life > 0);
}

function backgroundSymbol(x: number): BgSymbol {
   return {
      x,
      y: BG_TOP + Math.random() * BG_BAND,
      symbol: Math.floor(Math.random() * BG_SYMBOL_COUNT),
   };
}

export function fillBackground(fx: Effects, world: World): void {
   const bgGap = world.mobile ? 1.5 : 1;
   for (let x = 30; x < world.width; x += (BG_GAP_MIN + Math.random() * BG_GAP_SPREAD) * bgGap) {
      fx.background.push(backgroundSymbol(x));
   }
}

export function advanceBackground(fx: Effects, speed: number, world: World, dt: number): void {
   for (const b of fx.background) b.prevX = b.x;
   if (world.reducedMotion) return;
   const move = speed * BG_SPEED * dt;
   for (const b of fx.background) b.x -= move;
   fx.background = fx.background.filter((b) => b.x > -20);
   fx.backgroundIn -= move;
   if (fx.backgroundIn > 0) return;
   fx.background.push(backgroundSymbol(world.width + 10));
   fx.backgroundIn = (BG_GAP_MIN + Math.random() * BG_GAP_SPREAD) * (world.mobile ? 1.5 : 1);
}
