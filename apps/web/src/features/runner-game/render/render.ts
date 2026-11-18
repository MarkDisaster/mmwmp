import {
   BG_SYMBOLS,
   BLINK_TIME,
   GROUND_Y,
   INTRO_LINE_RATIO,
   LINE_THICKNESS,
   MILESTONE_TIME,
   ROBOT_GROUND_Y,
   ROBOT_SIZE,
   ROBOT_X,
   RUN_FRAME_TIME,
   START_SPEED,
   SWEEP_TIME,
} from '../engine/constants';
import {
   COOKIE_HEIGHT,
   CROWD_STEP,
   deadlineTop,
   KINDS,
   laneLift,
   MERGE_SHIFT,
   type Obstacle,
   pitWidth,
   rescheduleTop,
   SCOPE_LARGE,
   scopeSize,
   SPLIT_SHAKE_TIME,
   widthOf,
} from '../engine/obstacles';
import { type Pickup, type PickupKind, PICKUPS } from '../engine/pickups';
import { type GameState, type MilestoneKind } from '../engine/state';
import type { Effects } from './effects';
import { FONT_HEIGHT, glyph, LETTER_GAP, pixelTextWidth, SPACE_WIDTH } from './pixelFont';
import {
   BUG_A,
   BUG_B,
   BUG_FLY_A,
   BUG_FLY_B,
   BUG_PATCHED,
   CALENDAR,
   CLOCK,
   COMMENT,
   COMMENT_WARNING,
   COMMIT,
   DOCS,
   FEEDBACK,
   LEGACY_WALL,
   MEETING,
   MERGE_LEFT,
   MERGE_RIGHT,
   MERGED,
   PERSON,
   PHONE_LYING,
   PHONE_UPRIGHT,
   QUESTION,
   REVIEW,
   ROBOT_BLINK,
   ROBOT_BSOD,
   ROBOT_HAPPY_A,
   ROBOT_HAPPY_B,
   ROBOT_IDLE,
   ROBOT_JUMP,
   ROBOT_RUN_A,
   ROBOT_RUN_B,
   ROCKET,
   SCOPE_LARGE_BOX,
   SCOPE_SMALL_BOX,
   SEMICOLON,
   type Sprite,
   UPDATE,
} from './sprites';

export type MilestoneText = { title: string; subtitle: string };

export type View = {
   ctx: CanvasRenderingContext2D;
   width: number;
   scale: number;
   dpr: number;
   fg: string;
   brand: string;
   brandFg: string;
   font: string;
   reducedMotion: boolean;
   deliveredName: string;
   pickupNames: Record<PickupKind, string>;
   milestones: Record<MilestoneKind, MilestoneText>;
   alpha: number;
   time: number;
   sprites: SpriteCache;
};

const lerp = (from: number, to: number, alpha: number) => from + (to - from) * alpha;

export const drawX = (v: View, e: { x: number; prevX?: number }) =>
   e.prevX === undefined ? e.x : lerp(e.prevX, e.x, v.alpha);

const GAME_OVER_DIM = 0.15;
const BACKGROUND_ALPHA = 0.14;
const MILESTONE_ALPHA = 0.22;

const snap = (v: View, units: number) => Math.round(units * v.scale * v.dpr) / v.dpr;

function fill(v: View, x: number, y: number, w: number, h: number, color: string): void {
   const left = snap(v, x);
   const top = snap(v, y);
   v.ctx.fillStyle = color;
   v.ctx.fillRect(left, top, snap(v, x + w) - left, snap(v, y + h) - top);
}

const pixelColor = (v: View, ch: string) => (ch === 'B' ? v.brand : ch === 'P' ? v.brandFg : v.fg);

const spritePixel = (v: View) => Math.max(1, Math.round(v.scale * v.dpr));

type SpriteImage = { image: CanvasImageSource; width: number } | null;

export class SpriteCache {
   private key = '';
   private images = new Map<Sprite, SpriteImage>();

   prepare(v: View): void {
      const key = `${v.fg} ${v.brand} ${v.brandFg} ${v.scale} ${v.dpr}`;
      if (this.key === key) return;
      this.key = key;
      this.images = new Map();
   }

   get(v: View, rows: Sprite): SpriteImage {
      let image = this.images.get(rows);
      if (image === undefined) {
         image = paintSprite(v, rows);
         this.images.set(rows, image);
      }
      return image;
   }
}

function newCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement | null {
   if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
   if (typeof document === 'undefined') return null;
   const canvas = document.createElement('canvas');
   canvas.width = width;
   canvas.height = height;
   return canvas;
}

function paintSprite(v: View, rows: Sprite): SpriteImage {
   const px = spritePixel(v);
   const width = Math.max(...rows.map((row) => row.length));
   const canvas = newCanvas(width * px, rows.length * px);
   const ctx = canvas?.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null
      | undefined;
   if (!canvas || !ctx) return null;
   rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
         if (row[c] === '.') continue;
         ctx.fillStyle = pixelColor(v, row[c]);
         ctx.fillRect(c * px, r * px, px, px);
      }
   });
   return { image: canvas, width };
}

function sprite(v: View, rows: Sprite, x: number, bottom: number): void {
   const top = bottom - rows.length;
   const cached = v.sprites.get(v, rows);
   if (cached) {
      const size = spritePixel(v) / v.dpr;
      v.ctx.drawImage(
         cached.image,
         snap(v, x),
         snap(v, top),
         cached.width * size,
         rows.length * size,
      );
      return;
   }
   rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
         if (row[c] !== '.') fill(v, x + c, top + r, 1, 1, pixelColor(v, row[c]));
      }
   });
}

function text(
   v: View,
   value: string,
   x: number,
   y: number,
   color: string,
   alpha = 1,
   offsetPx = 0,
): void {
   const { ctx } = v;
   ctx.globalAlpha = alpha;
   ctx.fillStyle = color;
   ctx.font = `500 11px ${v.font}`;
   ctx.textAlign = 'center';
   ctx.fillText(value, Math.round(x * v.scale), Math.round(y * v.scale) + offsetPx);
   ctx.globalAlpha = 1;
}

function drawGround(v: View, s: GameState, fx: Effects): void {
   const gaps = s.entities.obstacles
      .filter((o) => KINDS[o.kind].pit || o.kind === 'platform')
      .map((o) => {
         const x = drawX(v, o);
         return [x, x + (o.kind === 'platform' ? widthOf(o) : pitWidth(o))] as const;
      })
      .sort((a, b) => a[0] - b[0]);
   let from = 0;
   for (const [a, b] of gaps) {
      if (a > from) fill(v, from, GROUND_Y, a - from, LINE_THICKNESS, v.fg);
      from = Math.max(from, b);
   }
   if (from < v.width) fill(v, from, GROUND_Y, v.width - from, LINE_THICKNESS, v.fg);
   for (const o of s.entities.obstacles) if (o.kind === 'platform') drawPlatform(v, o, drawX(v, o));
   drawSweep(v, fx);
}

function drawPlatform(v: View, o: Obstacle, x: number): void {
   const top = GROUND_Y - o.height;
   const height = o.height + LINE_THICKNESS;
   fill(v, x, top, o.length, LINE_THICKNESS, v.fg);
   fill(v, x, top, LINE_THICKNESS, height, v.fg);
   fill(v, x + o.length - LINE_THICKNESS, top, LINE_THICKNESS, height, v.fg);
}

const SWEEP_LENGTH = 80;

function drawSweep(v: View, fx: Effects): void {
   if (fx.sweep <= 0) return;
   if (v.reducedMotion) {
      if (fx.sweep > SWEEP_TIME / 2) fill(v, 0, GROUND_Y, v.width, LINE_THICKNESS, v.brand);
      return;
   }
   const head = (1 - fx.sweep / SWEEP_TIME) * (v.width + SWEEP_LENGTH);
   const tail = Math.max(0, head - SWEEP_LENGTH);
   fill(v, tail, GROUND_Y, Math.min(head, v.width) - tail, LINE_THICKNESS, v.brand);
}

function drawPatched(v: View, o: Obstacle, x: number, frame: Sprite): void {
   if (o.split > 0) {
      sprite(v, BUG_A, x, GROUND_Y);
      sprite(v, frame, x + o.split, GROUND_Y);
      return;
   }
   const jitter = o.shake > 0 && o.shake < SPLIT_SHAKE_TIME ? (Math.random() - 0.5) * 1.5 : 0;
   sprite(v, BUG_PATCHED, x + jitter, GROUND_Y);
   if (o.shake > 0) {
      fill(v, x - 2, GROUND_Y - 9, 2, 1, v.fg);
      fill(v, x + 10, GROUND_Y - 10, 2, 1, v.fg);
   }
}

function drawCookieWarning(v: View, o: Obstacle, x: number): void {
   const top = GROUND_Y - COOKIE_HEIGHT;
   for (let dx = 0; dx < 20; dx += 2) {
      fill(v, x + dx, top, 1, 1, v.fg);
      fill(v, x + dx, GROUND_Y - 1, 1, 1, v.fg);
   }
   for (let dy = 2; dy < COOKIE_HEIGHT - 1; dy += 2) {
      fill(v, x, top + dy, 1, 1, v.fg);
      fill(v, x + 19, top + dy, 1, 1, v.fg);
   }
}

function drawCookie(v: View, o: Obstacle, x: number): void {
   if (o.rise <= 0) {
      if (o.warn) drawCookieWarning(v, o, x);
      return;
   }
   const h = Math.max(1, Math.round(COOKIE_HEIGHT * o.rise));
   const top = GROUND_Y - h;
   fill(v, x, top, 20, 1, v.fg);
   fill(v, x, top, 1, h, v.fg);
   fill(v, x + 19, top, 1, h, v.fg);
   if (o.rise >= 1) {
      fill(v, x + 3, top + 3, 9, 1, v.fg);
      fill(v, x + 3, top + 5, 6, 1, v.fg);
      fill(v, x + 14, top + 3, 4, 3, v.fg);
   }
}

function drawScopeCreep(v: View, o: Obstacle, x: number): void {
   const size = scopeSize(o);
   const left = x + (SCOPE_LARGE - size) / 2;
   if (size === SCOPE_LARGE) sprite(v, SCOPE_LARGE_BOX, left, GROUND_Y);
   else if (o.grow === 0) sprite(v, SCOPE_SMALL_BOX, left, GROUND_Y);
   else {
      fill(v, left, GROUND_Y - size, size, 1, v.fg);
      fill(v, left, GROUND_Y - 1, size, 1, v.fg);
      fill(v, left, GROUND_Y - size, 1, size, v.fg);
      fill(v, left + size - 1, GROUND_Y - size, 1, size, v.fg);
   }
   if (o.grow < 1 && Math.floor(v.time / 0.15) % 2 === 0) {
      fill(v, left - 2, GROUND_Y - size - 2, 1, 1, v.fg);
      fill(v, left + size + 1, GROUND_Y - size - 2, 1, 1, v.fg);
   }
}

function drawMerge(v: View, o: Obstacle, x: number): void {
   if (o.grow >= 1) {
      sprite(v, MERGED, x + MERGE_SHIFT, GROUND_Y);
      return;
   }
   const shift = MERGE_SHIFT * o.grow;
   sprite(v, MERGE_LEFT, x + shift, GROUND_Y);
   sprite(v, MERGE_RIGHT, x + KINDS.merge.width - MERGE_LEFT[0].length - shift, GROUND_Y);
}

function drawFlyingBug(v: View, x: number): void {
   if (Math.floor(v.time / 0.1) % 2 === 0) sprite(v, BUG_FLY_A, x, GROUND_Y);
   else sprite(v, BUG_FLY_B, x, GROUND_Y + 1);
}

function drawMobile(v: View, o: Obstacle, x: number): void {
   if (o.grow <= 0) {
      sprite(v, PHONE_UPRIGHT, x + 3, GROUND_Y);
      return;
   }
   if (o.grow >= 1) {
      sprite(v, PHONE_LYING, x, GROUND_Y);
      return;
   }
   const { ctx } = v;
   const cx = (x + 6) * v.scale;
   const cy = (GROUND_Y - 6) * v.scale;
   ctx.save();
   ctx.translate(cx, cy);
   ctx.rotate((-Math.PI / 2) * o.grow);
   ctx.translate(-cx, -cy);
   sprite(v, PHONE_UPRIGHT, x + 3, GROUND_Y);
   ctx.restore();
}

function drawComment(v: View, o: Obstacle, x: number): void {
   if (o.warn) sprite(v, COMMENT_WARNING, x + 4, COMMENT_WARNING.length + 1);
   if (o.grow <= 0) return;
   const bottom = COMMENT.length + (GROUND_Y - COMMENT.length) * o.grow;
   sprite(v, COMMENT, x, bottom);
}

function drawDeadline(v: View, o: Obstacle, x: number): void {
   const top = deadlineTop(o.kind);
   sprite(v, CLOCK, x, top + CLOCK.length);
   if (Math.floor(v.time / 0.15) % 2 === 0) {
      fill(v, x - 2, top + 4, 1, 2, v.fg);
      fill(v, x + 12, top + 4, 1, 2, v.fg);
   }
}

function drawBug(v: View, o: Obstacle, x: number, frame: Sprite): void {
   if (o.skin === 'question') sprite(v, QUESTION, x - 1, GROUND_Y - 1);
   else if (o.skin === 'update') sprite(v, UPDATE, x, GROUND_Y);
   else if (o.lane > 0) drawFlyingBug(v, x);
   else sprite(v, frame, x, GROUND_Y);
}

function drawBugPair(v: View, o: Obstacle, x: number, frame: Sprite): void {
   if (o.lane > 0) {
      drawFlyingBug(v, x);
      drawFlyingBug(v, x + 12);
      return;
   }
   sprite(v, frame, x, GROUND_Y);
   sprite(v, frame === BUG_A ? BUG_B : BUG_A, x + 12, GROUND_Y);
}

function drawCrowd(v: View, o: Obstacle, x: number): void {
   for (let i = 0; i < o.count; i++) {
      const bob = (i + Math.floor(v.time / 0.2)) % 2;
      sprite(v, PERSON, x + i * CROWD_STEP, GROUND_Y - bob);
   }
}

function drawObstacle(v: View, o: Obstacle, x: number): void {
   const frame = Math.floor(v.time / 0.2) % 2 === 0 ? BUG_A : BUG_B;
   switch (o.kind) {
      case 'bug':
         drawBug(v, o, x, frame);
         return;
      case 'mobile':
         drawMobile(v, o, x);
         return;
      case 'comment':
         drawComment(v, o, x);
         return;
      case 'crowd':
         drawCrowd(v, o, x);
         return;
      case 'bugs':
         drawBugPair(v, o, x, frame);
         return;
      case 'patched':
         drawPatched(v, o, x, frame);
         return;
      case 'semicolon':
         sprite(v, SEMICOLON, x, GROUND_Y);
         return;
      case 'legacy':
         sprite(v, LEGACY_WALL, x, GROUND_Y);
         return;
      case 'cookie':
         drawCookie(v, o, x);
         return;
      case 'deadline':
      case 'deadlineLow':
         drawDeadline(v, o, x);
         return;
      case 'meeting':
         sprite(v, MEETING, x, GROUND_Y - 1);
         return;
      case 'scopeCreep':
         drawScopeCreep(v, o, x);
         return;
      case 'merge':
         drawMerge(v, o, x);
         return;
      case 'reschedule':
         drawReschedule(v, o, x);
         return;
      case 'leak':
         drawLeak(v, o, x);
         return;
      case 'pit404':
      case 'pit500':
      case 'platform':
         return;
   }
}

function drawReschedule(v: View, o: Obstacle, x: number): void {
   const shaking = o.shake > 0 && o.grow === 0;
   const jitter = shaking ? (Math.random() - 0.5) * 1.5 : 0;
   const top = rescheduleTop(o);
   sprite(v, CALENDAR, x + jitter, top + CALENDAR.length);
   if (shaking) {
      fill(v, x - 3, top + 1, 2, 1, v.fg);
      fill(v, x - 3, top + 8, 2, 1, v.fg);
   }
}

function drawLeak(v: View, o: Obstacle, x: number): void {
   if (o.grow <= 0) return;
   const width = pitWidth(o);
   for (let i = 0; i < 4; i++) {
      const dx = ((i * 7 + 3) % Math.max(1, Math.floor(width - 2))) + 1;
      const dy = ((v.time * 20 + i * 3) % 6) + 1;
      fill(v, x + dx, GROUND_Y + LINE_THICKNESS + dy - 3, 1, 1, v.fg);
   }
}

function drawBackground(v: View, s: GameState, fx: Effects): void {
   const { ctx } = v;
   ctx.globalAlpha *= BACKGROUND_ALPHA;
   ctx.fillStyle = v.fg;
   ctx.font = `700 ${v.scale * 5}px ${v.font}`;
   ctx.textAlign = 'center';
   if (fx.milestone) {
      ctx.globalAlpha /= BACKGROUND_ALPHA;
      return;
   }
   for (const b of fx.background) {
      ctx.fillText(
         BG_SYMBOLS[b.symbol],
         Math.round(drawX(v, b) * v.scale),
         Math.round(b.y * v.scale),
      );
   }
   ctx.globalAlpha /= BACKGROUND_ALPHA;
}

function pixelText(v: View, value: string, x: number, top: number, cell: number): void {
   let cursor = x;
   for (const char of value) {
      const rows = glyph(char);
      if (!rows) {
         cursor += (SPACE_WIDTH + LETTER_GAP) * cell;
         continue;
      }
      rows.forEach((row, r) => {
         for (let c = 0; c < row.length; c++) {
            if (row[c] === '#') fill(v, cursor + c * cell, top + r * cell, cell, cell, v.fg);
         }
      });
      cursor += (rows[0].length + LETTER_GAP) * cell;
   }
}

function drawMilestone(v: View, fx: Effects): void {
   if (!fx.milestone) return;
   const text = v.milestones[fx.milestone.kind];
   const title = text.title.replace('{version}', fx.milestone.version);
   const { subtitle } = text;
   const { ctx } = v;
   const desktop = v.scale >= 3;
   const cell = pixelTextWidth(title) * 2 <= v.width - 8 ? 2 : 1;
   const width = pixelTextWidth(title) * cell;
   const progress = 1 - fx.milestone.life / MILESTONE_TIME;
   const left = v.reducedMotion ? (v.width - width) / 2 : v.width - progress * (v.width + width);
   const fade = v.reducedMotion ? Math.min(1, fx.milestone.life / 0.3) : 1;
   ctx.globalAlpha = MILESTONE_ALPHA * fade;
   const top = cell === 2 ? 6 : 10;
   pixelText(v, title, Math.round(left), top, cell);
   if (desktop) {
      ctx.fillStyle = v.fg;
      ctx.textAlign = 'center';
      ctx.font = `600 13px ${v.font}`;
      const baseline = (top + FONT_HEIGHT * cell + 5) * v.scale;
      ctx.fillText(subtitle, Math.round((left + width / 2) * v.scale), Math.round(baseline));
   }
   ctx.globalAlpha = 1;
}

function robotFrame(v: View, s: GameState): Sprite {
   if (s.run.gameOver) return ROBOT_BSOD;
   if (!s.run.started) return Math.floor(v.time / BLINK_TIME) % 2 === 0 ? ROBOT_IDLE : ROBOT_BLINK;
   if (!s.robot.grounded) return ROBOT_JUMP;
   const frameTime = RUN_FRAME_TIME * (START_SPEED / s.entities.speed);
   const first = Math.floor(v.time / frameTime) % 2 === 0;
   if (s.run.celebrate > 0) return first ? ROBOT_HAPPY_A : ROBOT_HAPPY_B;
   return first ? ROBOT_RUN_A : ROBOT_RUN_B;
}

function drawSkill(v: View, p: Pickup): void {
   const x = drawX(v, p);
   const { w, h } = PICKUPS.skill;
   fill(v, x, p.y, w, h, v.brand);
   const size = v.scale >= 3 ? 12 : 9;
   const { ctx } = v;
   ctx.fillStyle = v.brandFg;
   ctx.font = `600 ${size}px ${v.font}`;
   ctx.textAlign = 'center';
   ctx.fillText(
      p.label,
      Math.round((x + w / 2) * v.scale),
      Math.round((p.y + h / 2) * v.scale + size * 0.35),
   );
}

function drawPickup(v: View, p: Pickup): void {
   const x = drawX(v, p);
   if (p.kind === 'commit') sprite(v, COMMIT, x, p.y + COMMIT.length);
   else if (p.kind === 'review') sprite(v, REVIEW, x, p.y + REVIEW.length);
   else if (p.kind === 'deploy') sprite(v, ROCKET, x, p.y + ROCKET.length);
   else if (p.kind === 'feedback') sprite(v, FEEDBACK, x, p.y + FEEDBACK.length);
   else if (p.kind === 'docs') sprite(v, DOCS, x, p.y + DOCS.length);
   else drawSkill(v, p);
}

function drawEffects(v: View, s: GameState, fx: Effects): void {
   if (!s.run.gameOver) for (const p of s.entities.pickups) drawPickup(v, p);
   for (const p of fx.particles) {
      v.ctx.globalAlpha = Math.max(0, p.life / 0.35);
      fill(v, p.x, p.y, 1, 1, v.fg);
   }
   v.ctx.globalAlpha = 1;
   for (const p of fx.popups) {
      const name = p.delivered ? v.deliveredName : p.pickup && (p.label || v.pickupNames[p.pickup]);
      const value = name ? `${name} ${p.text}` : p.text;
      text(v, value, p.x, p.y, p.brand ? v.brand : v.fg, Math.min(1, p.life / 0.3));
   }
}

function drawObstacles(v: View, s: GameState): void {
   const { ctx } = v;
   for (const o of s.entities.obstacles) {
      if (s.run.gameOver && o !== s.run.killer) ctx.globalAlpha = GAME_OVER_DIM;
      ctx.save();
      ctx.translate(0, -snap(v, o.elev + laneLift(o)));
      drawObstacle(v, o, drawX(v, o));
      ctx.restore();
      ctx.globalAlpha = 1;
   }
}

export function drawGame(v: View, s: GameState, fx: Effects): void {
   v.sprites.prepare(v);
   const { ctx } = v;
   ctx.save();
   if (fx.shake > 0 && !v.reducedMotion) {
      ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4);
   }
   if (s.run.gameOver) v.ctx.globalAlpha = GAME_OVER_DIM;
   drawBackground(v, s, fx);
   v.ctx.globalAlpha = 1;
   if (!s.run.gameOver) drawMilestone(v, fx);
   drawGround(v, s, fx);
   drawObstacles(v, s);
   drawEffects(v, s, fx);
   sprite(v, robotFrame(v, s), ROBOT_X, lerp(s.robot.prevY, s.robot.y, v.alpha) + ROBOT_SIZE);
   ctx.restore();
}

export function drawIntro(v: View, s: GameState, progress: number): void {
   v.sprites.prepare(v);
   const lineProgress = Math.min(1, progress / INTRO_LINE_RATIO);
   const half = (v.width / 2) * lineProgress;
   fill(v, v.width / 2 - half, GROUND_Y, half * 2, LINE_THICKNESS, v.fg);
   if (progress < INTRO_LINE_RATIO) return;
   const walk = (progress - INTRO_LINE_RATIO) / (1 - INTRO_LINE_RATIO);
   const x = -ROBOT_SIZE + (ROBOT_X + ROBOT_SIZE) * walk;
   const frame =
      walk >= 1
         ? ROBOT_IDLE
         : Math.floor(v.time / RUN_FRAME_TIME) % 2 === 0
           ? ROBOT_RUN_A
           : ROBOT_RUN_B;
   sprite(v, frame, x, ROBOT_GROUND_Y + ROBOT_SIZE);
}
