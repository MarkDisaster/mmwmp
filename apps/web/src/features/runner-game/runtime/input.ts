export const INTERACTIVE =
   'a, button, input, select, textarea, summary, label, [contenteditable="true"], [contenteditable=""], [role="button"], [role="link"], [role="switch"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="dialog"], [data-game-ui]';

const JUMP_KEYS = new Set(['Space', 'ArrowUp']);

export type InputHandlers = {
   onPress: () => void;
   onRelease: () => void;
   onQuit: () => void;
   onScreen: () => boolean;
   inView: () => boolean;
   playing: () => boolean;
   active: () => boolean;
};

export type KeyPress = {
   code: string;
   fromControl: boolean;
   fromGame: boolean;
   focusFree: boolean;
   defaultPrevented: boolean;
   onScreen: boolean;
   inView: boolean;
   active: boolean;
};

export function keyAction(key: KeyPress): 'jump' | 'quit' | null {
   const jump = JUMP_KEYS.has(key.code);
   if (!jump && key.code !== 'Escape') return null;
   if (!key.onScreen || key.fromControl) return null;
   if (!jump) return key.focusFree && !key.defaultPrevented && key.active ? 'quit' : null;
   return key.inView || key.fromGame || key.active ? 'jump' : null;
}

export class Input {
   constructor(
      private readonly wrapper: HTMLElement,
      private readonly touchArea: HTMLElement,
      private readonly handlers: InputHandlers,
   ) {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      this.touchArea.addEventListener('touchstart', this.onTouchStart, { passive: true });
      this.touchArea.addEventListener('touchend', handlers.onRelease, { passive: true });
      this.touchArea.addEventListener('touchcancel', handlers.onRelease, { passive: true });
   }

   private readonly onKeyDown = (e: KeyboardEvent) => {
      const { handlers, wrapper } = this;
      const target = e.target instanceof Element ? e.target : null;
      const focused = document.activeElement;
      const action = keyAction({
         code: e.code,
         fromControl: Boolean(target?.closest(INTERACTIVE)),
         fromGame: target !== null && wrapper.contains(target),
         focusFree: !focused || focused === document.body || wrapper.contains(focused),
         defaultPrevented: e.defaultPrevented,
         onScreen: handlers.onScreen(),
         inView: handlers.inView(),
         active: handlers.active(),
      });
      if (action === 'quit') handlers.onQuit();
      if (action !== 'jump') return;
      e.preventDefault();
      if (!e.repeat) handlers.onPress();
   };

   private readonly onKeyUp = (e: KeyboardEvent) => {
      if (JUMP_KEYS.has(e.code)) this.handlers.onRelease();
   };

   private readonly onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE)) return;
      if (!this.handlers.playing() && !this.wrapper.contains(target)) return;
      this.handlers.onPress();
   };

   dispose(): void {
      const { handlers, touchArea } = this;
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      touchArea.removeEventListener('touchstart', this.onTouchStart);
      touchArea.removeEventListener('touchend', handlers.onRelease);
      touchArea.removeEventListener('touchcancel', handlers.onRelease);
   }
}
