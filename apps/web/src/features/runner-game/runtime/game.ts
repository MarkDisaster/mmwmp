import type { RunnerTopPlayer } from '@/api/generated/models/RunnerTopPlayer';

import {
   BLINK_TIME,
   HEADROOM,
   HUD_REFRESH_TIME,
   IDLE_BUBBLE_DROP,
   IDLE_BUBBLE_GAP,
   INTRO_DURATION_MS,
   MAX_FRAME_DT,
   RESTART_COOLDOWN_MS,
   ROBOT_GROUND_Y,
   ROBOT_SIZE,
   ROBOT_X,
   STEP,
   WORLD_HEIGHT,
} from '../engine/constants';
import { beginRun, step, stepGameOver } from '../engine/engine';
import type { Skin } from '../engine/obstacles';
import { VETERAN_TIME } from '../engine/phases';
import { pressJump, releaseJump } from '../engine/physics';
import type { PickupKind } from '../engine/pickups';
import { phaseLabel, skipTo } from '../engine/progress';
import { createState, type GameState, type MilestoneKind, type World } from '../engine/state';
import {
   advanceBackground,
   advanceGameTime,
   advanceRealTime,
   applyEvents,
   createEffects,
   type Effects,
   fillBackground,
} from '../render/effects';
import { drawGame, drawIntro, type MilestoneText, SpriteCache, type View } from '../render/render';
import { Input } from './input';
import { PlayerRecord } from './storage';
import { Viewport } from './viewport';

export type Hud = {
   score: number;
   best: RunnerTopPlayer | null;
   phase: ReturnType<typeof phaseLabel>;
};

export type GameOverInfo = {
   line: string;
   score: number;
   newRecord: boolean;
   bubbleLeft: number;
   bubbleBottom: number;
   bubbleBeside: boolean;
};

export type Colors = { fg: string; brand: string; brandFg: string };

export type Labels = {
   deaths: Record<Skin, string[]>;
   milestones: Record<MilestoneKind, MilestoneText>;
   pickupNames: Record<PickupKind, string>;
   deliveredName: string;
};

export type GameOptions = {
   startDelaySeconds: number;
   skipIntro: boolean;
   touchArea?: HTMLElement;
};

export type GameCallbacks = {
   onHud: (hud: Hud) => void;
   onStarted: (started: boolean) => void;
   onGameOver: (info: GameOverInfo | null) => void;
   onResumeHint: (visible: boolean) => void;
   onIntroDone: () => void;
   onRunStarted: () => void;
   onResultLeft: (result: { score: number; seconds: number }) => void;
};

type SessionWorld = { -readonly [K in keyof World]: World[K] };

const BUBBLE_GAP_PX = 8;
const BUBBLE_ROOM_PX = 34;
const BUBBLE_ROOM_MOBILE_PX = 48;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const IN_VIEW_RATIO = 0.5;

export function frameDelay(idle: boolean, animTime: number): number {
   if (!idle) return 0;
   return (Math.floor(animTime / BLINK_TIME) + 1) * BLINK_TIME - animTime;
}

export class Game {
   private s: GameState;
   private fx: Effects = createEffects();
   private readonly world: SessionWorld;
   private readonly record = new PlayerRecord();
   private readonly sprites = new SpriteCache();
   private readonly ctx: CanvasRenderingContext2D;
   private readonly viewport: Viewport;
   private readonly input: Input;
   private readonly visibility: IntersectionObserver;
   private readonly motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
   private reducedMotion: boolean;
   private readonly font: string;
   private colors: Colors | null = null;
   private best: RunnerTopPlayer | null | undefined;
   private labels: Labels | null = null;

   private readonly skipSeconds: number;
   private readonly fixedSeed: number | null;

   private raf = 0;
   private timer: ReturnType<typeof setTimeout> | undefined;
   private last = performance.now();
   private acc = 0;
   private hudTimer = 0;
   private overAt = 0;
   private resultLeft = false;
   private introProgress: number;
   private introStart: number | null = null;
   private readonly lastLine = new Map<Skin, number>();

   private onScreen = true;
   private inView = false;
   private running = false;
   private waitingResume = false;
   private disposed = false;

   constructor(
      canvas: HTMLCanvasElement,
      wrapper: HTMLElement,
      private readonly options: GameOptions,
      private readonly callbacks: GameCallbacks,
   ) {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('RunnerGame: no 2D canvas');
      this.ctx = ctx;
      this.reducedMotion = this.motionQuery.matches;
      this.font = getComputedStyle(wrapper).fontFamily;
      this.introProgress = options.skipIntro ? 1 : 0;
      if (this.reducedMotion) this.introStart = -Infinity;

      const devParams = new URLSearchParams(
         process.env.NODE_ENV === 'production' ? '' : window.location.search,
      );
      this.skipSeconds = Number(devParams.get('runner')) || 0;
      const seed = devParams.get('seed');
      this.fixedSeed = seed !== null && seed !== '' ? Number(seed) >>> 0 : null;
      this.s = this.newState();

      this.world = {
         width: 0,
         mobile: false,
         reducedMotion: this.reducedMotion,
         veteran: this.record.bestTime >= VETERAN_TIME,
      };
      this.viewport = new Viewport(canvas, ctx, (width, mobile) => {
         this.world.width = width;
         this.world.mobile = mobile;
         this.render();
      });
      this.input = new Input(wrapper, options.touchArea ?? wrapper, {
         onPress: this.press,
         onRelease: this.release,
         onQuit: this.quit,
         onScreen: () => this.onScreen,
         inView: () => this.inView,
         playing: () => this.s.run.started && !this.s.run.gameOver && !this.waitingResume,
         active: () => this.s.run.started || this.s.run.gameOver,
      });
      this.visibility = new IntersectionObserver(
         (entries) => {
            const entry = entries[entries.length - 1];
            this.onScreen = entry.isIntersecting;
            this.inView = entry.intersectionRatio >= IN_VIEW_RATIO;
            this.updatePause();
         },
         { threshold: [0, IN_VIEW_RATIO] },
      );
      this.visibility.observe(wrapper);
      this.motionQuery.addEventListener('change', this.onMotionChange);
      window.addEventListener('blur', this.onFocusChange);
      window.addEventListener('focus', this.onFocusChange);
      document.addEventListener('visibilitychange', this.onFocusChange);
      window.addEventListener('pagehide', this.leaveResult);
      window.addEventListener('pageshow', this.onPageShow);
      this.updatePause();
   }

   setColors(colors: Colors): void {
      this.colors = colors;
      this.wake();
   }

   setLabels(labels: Labels): void {
      this.labels = labels;
      this.wake();
   }

   setBestScore(best: RunnerTopPlayer | null | undefined): void {
      this.best = best;
      this.pushHud();
   }

   readonly retry = () => this.reset(true);

   readonly retryAfterCooldown = () => {
      if (performance.now() - this.overAt >= RESTART_COOLDOWN_MS) this.reset(true);
   };

   readonly quit = () => this.reset(false);

   dispose(): void {
      this.leaveResult();
      this.disposed = true;
      this.running = false;
      this.stop();
      this.visibility.disconnect();
      this.motionQuery.removeEventListener('change', this.onMotionChange);
      window.removeEventListener('blur', this.onFocusChange);
      window.removeEventListener('focus', this.onFocusChange);
      document.removeEventListener('visibilitychange', this.onFocusChange);
      window.removeEventListener('pagehide', this.leaveResult);
      window.removeEventListener('pageshow', this.onPageShow);
      this.viewport.dispose();
      this.input.dispose();
   }

   private newState(): GameState {
      return this.fixedSeed === null ? createState() : createState(this.fixedSeed);
   }

   private handleEvents(): void {
      applyEvents(this.fx, this.s.events);
      this.s.events.length = 0;
   }

   private pushHud(): void {
      this.callbacks.onHud({
         score: this.s.run.score,
         best: this.best ?? null,
         phase: phaseLabel(this.s),
      });
   }

   private start(): void {
      this.world.veteran = this.record.bestTime >= VETERAN_TIME;
      if (this.skipSeconds > 0) {
         this.world.veteran = false;
         skipTo(this.s, this.skipSeconds);
      }
      beginRun(this.s);
      fillBackground(this.fx, this.world);
      this.handleEvents();
      this.callbacks.onRunStarted();
      this.callbacks.onStarted(true);
      this.last = performance.now();
      this.wake();
   }

   private readonly leaveResult = () => {
      const { run } = this.s;
      if (!run.gameOver || this.resultLeft) return;
      this.resultLeft = true;
      this.callbacks.onResultLeft({ score: run.score, seconds: Math.floor(run.tally.seconds) });
   };

   private readonly onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && this.s.run.gameOver && this.resultLeft) this.reset(false);
   };

   private readonly onMotionChange = () => {
      this.reducedMotion = this.motionQuery.matches;
      this.world.reducedMotion = this.reducedMotion;
      if (this.reducedMotion) this.introStart = -Infinity;
      this.wake();
   };

   private reset(play: boolean): void {
      this.leaveResult();
      this.waitingResume = false;
      this.callbacks.onResumeHint(false);
      this.s = this.newState();
      this.fx = createEffects();
      if (play) this.start();
      else this.callbacks.onStarted(false);
      this.callbacks.onGameOver(null);
      this.pushHud();
   }

   private deathLine(cause: Skin): string {
      const lines = this.labels?.deaths[cause] ?? [];
      if (lines.length === 0) return '';
      let index = Math.floor(Math.random() * lines.length);
      if (lines.length > 1 && index === this.lastLine.get(cause))
         index = (index + 1) % lines.length;
      this.lastLine.set(cause, index);
      return lines[index];
   }

   private finish(): void {
      const { s } = this;
      this.overAt = performance.now();
      this.resultLeft = false;
      if (process.env.NODE_ENV !== 'production') {
         console.warn(`RunnerGame: run over, replay it with ?seed=${s.run.seed}`);
      }
      this.record.finishRun(s.run.tally.seconds);
      const newRecord = this.best !== undefined && s.run.score > (this.best?.score ?? 0);
      this.pushHud();
      if (!s.run.cause) return;
      const { scale } = this.viewport;
      const robotTop = Math.min(ROBOT_GROUND_Y, s.robot.y);
      const room = (robotTop + HEADROOM) * scale;
      const beside = room < (this.world.mobile ? BUBBLE_ROOM_MOBILE_PX : BUBBLE_ROOM_PX);
      this.callbacks.onGameOver({
         line: this.deathLine(s.run.cause),
         score: s.run.score,
         newRecord,
         bubbleLeft: beside
            ? (ROBOT_X + ROBOT_SIZE + IDLE_BUBBLE_GAP) * scale
            : (ROBOT_X - 2) * scale,
         bubbleBottom: beside
            ? (WORLD_HEIGHT - robotTop - IDLE_BUBBLE_DROP) * scale
            : (WORLD_HEIGHT - robotTop) * scale + BUBBLE_GAP_PX,
         bubbleBeside: beside,
      });
   }

   private readonly press = () => {
      const { s } = this;
      if (this.waitingResume) {
         this.waitingResume = false;
         this.callbacks.onResumeHint(false);
         this.last = performance.now();
         return;
      }
      if (s.run.gameOver) {
         this.retryAfterCooldown();
         return;
      }
      if (!s.run.started) {
         this.start();
         this.pushHud();
      }
      pressJump(s);
      this.handleEvents();
   };

   private readonly release = () => releaseJump(this.s);

   private simulate(real: number): void {
      const { s } = this;
      this.acc += real;
      while (this.acc >= STEP && !s.run.gameOver) {
         step(s, STEP, this.world);
         advanceGameTime(this.fx, STEP);
         advanceBackground(this.fx, s.entities.speed, this.world, STEP);
         this.handleEvents();
         this.acc -= STEP;
      }
      if (s.run.gameOver) {
         this.finish();
         return;
      }
      this.hudTimer += real;
      if (this.hudTimer >= HUD_REFRESH_TIME) {
         this.hudTimer = 0;
         this.pushHud();
      }
   }

   private advanceIntro(): void {
      if (this.introProgress >= 1) return;
      if (this.introStart === null) {
         this.introStart = performance.now() + this.options.startDelaySeconds * 1000;
      }
      const elapsed = performance.now() - this.introStart;
      if (elapsed < 0) return;
      this.introProgress = Math.min(1, elapsed / INTRO_DURATION_MS);
      if (this.introProgress >= 1) this.callbacks.onIntroDone();
   }

   private render(): void {
      const { s, labels, colors, viewport } = this;
      if (!labels || !colors || !viewport) return;
      const { scale } = viewport;
      this.ctx.clearRect(
         0,
         -HEADROOM * scale,
         viewport.cssWidth,
         (WORLD_HEIGHT + HEADROOM) * scale,
      );
      const view: View = {
         ctx: this.ctx,
         width: this.world.width,
         scale,
         dpr: viewport.dpr,
         ...colors,
         font: this.font,
         reducedMotion: this.reducedMotion,
         pickupNames: labels.pickupNames,
         deliveredName: labels.deliveredName,
         milestones: labels.milestones,
         alpha: s.run.started && !s.run.gameOver && !this.waitingResume ? this.acc / STEP : 1,
         time: this.fx.animTime,
         sprites: this.sprites,
      };
      if (s.run.started || this.introProgress >= 1) {
         drawGame(view, s, this.fx);
         return;
      }
      this.advanceIntro();
      drawIntro(view, s, this.introProgress);
   }

   private isIdle(): boolean {
      return !this.s.run.started && this.introProgress >= 1;
   }

   private readonly loop = (now: number) => {
      const elapsed = (now - this.last) / 1000;
      const real = Math.min(MAX_FRAME_DT, elapsed);
      this.last = now;
      const { s } = this;
      if (this.waitingResume) {
         this.acc = 0;
      } else if (s.run.started && !s.run.gameOver) {
         this.simulate(real);
      } else {
         this.acc = 0;
         this.fx.animTime += s.run.gameOver ? real : elapsed;
         if (s.run.gameOver) stepGameOver(s, real);
      }
      advanceRealTime(this.fx, real);
      this.render();
      if (this.running) this.schedule();
   };

   private schedule(): void {
      const delay = frameDelay(this.isIdle(), this.fx.animTime);
      if (delay === 0) this.raf = requestAnimationFrame(this.loop);
      else this.timer = setTimeout(this.nextFrame, delay * 1000);
   }

   private readonly nextFrame = () => {
      this.raf = requestAnimationFrame(this.loop);
   };

   private stop(): void {
      cancelAnimationFrame(this.raf);
      clearTimeout(this.timer);
   }

   private wake(): void {
      if (!this.running) return;
      this.stop();
      this.raf = requestAnimationFrame(this.loop);
   }

   private isPaused(): boolean {
      return !this.onScreen || document.hidden || !document.hasFocus();
   }

   private updatePause(): void {
      if (this.disposed) return;
      if (this.isPaused()) {
         if (!this.running) return;
         this.running = false;
         this.stop();
         releaseJump(this.s);
         return;
      }
      if (this.running) return;
      if (this.s.run.started && !this.s.run.gameOver) {
         this.waitingResume = true;
         this.callbacks.onResumeHint(true);
      }
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
   }

   private readonly onFocusChange = () => this.updatePause();
}
