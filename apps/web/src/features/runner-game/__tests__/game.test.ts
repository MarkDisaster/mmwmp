// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BLINK_TIME, RESTART_COOLDOWN_MS } from '../engine/constants';
import { frameDelay, Game, type GameCallbacks } from '../runtime/game';

type Listener = { type: string; listener: unknown };

function track(target: EventTarget, live: Listener[]): void {
   const add = target.addEventListener.bind(target);
   const remove = target.removeEventListener.bind(target);
   vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
      live.push({ type, listener });
      add(type, listener, options);
   });
   vi.spyOn(target, 'removeEventListener').mockImplementation((type, listener, options) => {
      const index = live.findIndex((l) => l.type === type && l.listener === listener);
      if (index >= 0) live.splice(index, 1);
      remove(type, listener, options);
   });
}

function trackMediaQueries(live: Listener[]): void {
   const matchMedia = window.matchMedia.bind(window);
   vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      const list = matchMedia(query);
      track(list, live);
      return list;
   });
}

function mountGame(
   beforeStart: (page: { section: HTMLElement; wrapper: HTMLElement }) => void = () => {},
   callbacks: Partial<GameCallbacks> = {},
) {
   const section = document.createElement('section');
   const wrapper = document.createElement('div');
   const box = document.createElement('div');
   const canvas = document.createElement('canvas');
   box.append(canvas);
   wrapper.append(box);
   section.append(wrapper);
   document.body.append(section);
   const ctx = new Proxy({} as Record<string | symbol, unknown>, {
      get: (target, key) => (key in target ? target[key] : () => undefined),
      set: (target, key, value) => {
         target[key] = value;
         return true;
      },
   });
   vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
   beforeStart({ section, wrapper });
   const game = new Game(
      canvas,
      wrapper,
      { startDelaySeconds: 0, skipIntro: true },
      {
         onHud: () => {},
         onStarted: () => {},
         onGameOver: () => {},
         onResumeHint: () => {},
         onIntroDone: () => {},
         onRunStarted: () => {},
         onResultLeft: () => {},
         ...callbacks,
      },
   );
   return { game, section, wrapper };
}

describe('Game.dispose', () => {
   afterEach(() => {
      vi.restoreAllMocks();
      document.body.innerHTML = '';
   });

   it('leaves no listener behind on the window, the document or the page', () => {
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      const live: Listener[] = [];
      track(window, live);
      track(document, live);
      trackMediaQueries(live);
      const { game } = mountGame(({ section, wrapper }) => {
         track(section, live);
         track(wrapper, live);
      });
      expect(live.length).toBeGreaterThanOrEqual(10);
      expect(live.map((l) => l.type)).toContain('change');
      game.dispose();
      expect(live.map((l) => l.type)).toEqual([]);
   });

   it('stops its frame loop and its observers', async () => {
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      const frames = vi.spyOn(window, 'requestAnimationFrame');
      const resize = vi.spyOn(ResizeObserver.prototype, 'disconnect');
      const visibility = vi.spyOn(IntersectionObserver.prototype, 'disconnect');
      const { game } = mountGame();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(frames).toHaveBeenCalled();
      game.dispose();
      const requested = frames.mock.calls.length;
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(frames.mock.calls.length).toBe(requested);
      expect(resize).toHaveBeenCalled();
      expect(visibility).toHaveBeenCalled();
   });
});

describe('leaving a result', () => {
   afterEach(() => {
      vi.restoreAllMocks();
      document.body.innerHTML = '';
   });

   const finishRun = (game: Game) => {
      const { run } = (game as unknown as { s: { run: Record<string, unknown> } }).s;
      Object.assign(run, { started: true, gameOver: true, score: 42 });
      (run.tally as { seconds: number }).seconds = 9.7;
   };

   it('reports the result once when the page is left, and not again when the game goes away', () => {
      const onResultLeft = vi.fn();
      const { game } = mountGame(undefined, { onResultLeft });
      finishRun(game);

      window.dispatchEvent(new Event('pagehide'));
      game.dispose();

      expect(onResultLeft).toHaveBeenCalledTimes(1);
      expect(onResultLeft).toHaveBeenCalledWith({ score: 42, seconds: 9 });
   });

   it('reports a result left by unmounting the game', () => {
      const onResultLeft = vi.fn();
      const { game } = mountGame(undefined, { onResultLeft });
      finishRun(game);

      game.dispose();

      expect(onResultLeft).toHaveBeenCalledTimes(1);
   });

   it('starts a new run on the scoreboard with every retry', () => {
      const onRunStarted = vi.fn();
      const onResultLeft = vi.fn();
      const { game } = mountGame(undefined, { onRunStarted, onResultLeft });
      finishRun(game);

      game.retry();

      expect(onResultLeft).toHaveBeenCalledTimes(1);
      expect(onRunStarted).toHaveBeenCalledTimes(1);
      game.dispose();
      expect(onResultLeft).toHaveBeenCalledTimes(1);
   });

   it('retries from a key only once the cooldown after the crash has passed', () => {
      const onRunStarted = vi.fn();
      const { game } = mountGame(undefined, { onRunStarted });
      finishRun(game);
      const overAt = 10_000;
      (game as unknown as { overAt: number }).overAt = overAt;
      const now = vi.spyOn(performance, 'now');
      const pressSpace = () =>
         window.dispatchEvent(
            new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }),
         );

      now.mockReturnValue(overAt + RESTART_COOLDOWN_MS - 1);
      pressSpace();
      expect(onRunStarted).not.toHaveBeenCalled();

      now.mockReturnValue(overAt + RESTART_COOLDOWN_MS);
      pressSpace();
      expect(onRunStarted).toHaveBeenCalledTimes(1);
      game.dispose();
   });
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('drawing only what changes', () => {
   afterEach(() => {
      vi.restoreAllMocks();
      document.body.innerHTML = '';
   });

   it('draws every frame while anything moves', () => {
      expect(frameDelay(false, 0.2)).toBe(0);
   });

   it('waits on the idle game until the robot blinks or opens its eyes again', () => {
      expect(frameDelay(true, 0.2)).toBeCloseTo(BLINK_TIME - 0.2);
      expect(frameDelay(true, BLINK_TIME)).toBeCloseTo(BLINK_TIME);
      expect(frameDelay(true, BLINK_TIME * 3 + 0.1)).toBeCloseTo(BLINK_TIME - 0.1);
   });

   it('sleeps while idle and runs every frame from the first jump', async () => {
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      const frames = vi.spyOn(window, 'requestAnimationFrame');
      const { game, wrapper } = mountGame();
      await vi.waitFor(() => expect((game as unknown as { timer?: unknown }).timer).toBeDefined());
      await wait(100);
      expect(frames).toHaveBeenCalledTimes(1);

      wrapper.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
      expect(frames).toHaveBeenCalledTimes(2);
      await vi.waitFor(() => expect(frames.mock.calls.length).toBeGreaterThan(3), {
         timeout: 2000,
      });
      game.dispose();
   });
});

describe('Space on the page', () => {
   afterEach(() => {
      vi.restoreAllMocks();
      document.body.innerHTML = '';
   });

   const space = (target: EventTarget) => {
      const event = new KeyboardEvent('keydown', {
         code: 'Space',
         bubbles: true,
         cancelable: true,
      });
      target.dispatchEvent(event);
      return event;
   };

   it('scrolls the page until the game is mostly in view', () => {
      const onRunStarted = vi.fn();
      const { game } = mountGame(undefined, { onRunStarted });
      expect(space(document.body).defaultPrevented).toBe(false);
      expect(onRunStarted).not.toHaveBeenCalled();
      game.dispose();
   });

   it('starts the game when it has the focus', () => {
      const onRunStarted = vi.fn();
      const { game, wrapper } = mountGame(undefined, { onRunStarted });
      expect(space(wrapper).defaultPrevented).toBe(true);
      expect(onRunStarted).toHaveBeenCalledTimes(1);
      game.dispose();
   });
});

describe('the back/forward cache', () => {
   afterEach(() => {
      vi.restoreAllMocks();
      document.body.innerHTML = '';
   });

   const pageEvent = (type: string, persisted: boolean) =>
      window.dispatchEvent(Object.assign(new Event(type), { persisted }));

   const finishRun = (game: Game) => {
      const { run } = (game as unknown as { s: { run: Record<string, unknown> } }).s;
      Object.assign(run, { started: true, gameOver: true, score: 42 });
   };

   it('starts over idle when the page comes back, its result saved as it was hidden', () => {
      const onResultLeft = vi.fn();
      const onGameOver = vi.fn();
      const { game } = mountGame(undefined, { onResultLeft, onGameOver });
      finishRun(game);

      pageEvent('pagehide', true);
      pageEvent('pageshow', true);

      expect(onResultLeft).toHaveBeenCalledTimes(1);
      expect(onGameOver).toHaveBeenLastCalledWith(null);
      game.dispose();
      expect(onResultLeft).toHaveBeenCalledTimes(1);
   });

   it('keeps a result that was never left', () => {
      const onGameOver = vi.fn();
      const { game } = mountGame(undefined, { onGameOver });
      finishRun(game);

      pageEvent('pageshow', true);

      expect(onGameOver).not.toHaveBeenCalled();
      game.dispose();
   });
});
