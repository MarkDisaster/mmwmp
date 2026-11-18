import { describe, expect, it } from 'vitest';

import { INTERACTIVE, keyAction, type KeyPress } from '../runtime/input';

const press = (overrides: Partial<KeyPress> = {}): KeyPress => ({
   code: 'Space',
   fromControl: false,
   fromGame: false,
   focusFree: true,
   defaultPrevented: false,
   onScreen: true,
   inView: true,
   active: false,
   ...overrides,
});

describe('jump keys', () => {
   it('jump with Space or ↑ while the game is in view', () => {
      expect(keyAction(press())).toBe('jump');
      expect(keyAction(press({ code: 'ArrowUp' }))).toBe('jump');
   });

   it('leave Space to the page while the game only peeks in at the top', () => {
      expect(keyAction(press({ inView: false }))).toBeNull();
   });

   it('jump on a game partly in view once the player is at it: focused, or a run on', () => {
      expect(keyAction(press({ inView: false, fromGame: true }))).toBe('jump');
      expect(keyAction(press({ inView: false, active: true }))).toBe('jump');
   });

   it('never jump on a game scrolled out of view, even focused or during a run', () => {
      expect(keyAction(press({ onScreen: false, inView: false, fromGame: true }))).toBeNull();
      expect(keyAction(press({ onScreen: false, inView: false, active: true }))).toBeNull();
   });

   it('leave the keys of a focused control alone', () => {
      expect(keyAction(press({ fromControl: true, active: true }))).toBeNull();
   });

   it('ignore every other key', () => {
      expect(keyAction(press({ code: 'ArrowDown' }))).toBeNull();
      expect(keyAction(press({ code: 'Enter', active: true }))).toBeNull();
   });
});

describe('Escape', () => {
   const escape = (overrides: Partial<KeyPress> = {}) =>
      keyAction(press({ code: 'Escape', active: true, ...overrides }));

   it('ends a run or its result', () => {
      expect(escape()).toBe('quit');
      expect(escape({ inView: false })).toBe('quit');
   });

   it('does nothing on the idle game or a game out of view', () => {
      expect(escape({ active: false })).toBeNull();
      expect(escape({ onScreen: false })).toBeNull();
   });

   it('leaves menus and dialogs to close first', () => {
      expect(escape({ focusFree: false })).toBeNull();
      expect(escape({ defaultPrevented: true })).toBeNull();
      expect(escape({ fromControl: true })).toBeNull();
   });
});

describe('INTERACTIVE', () => {
   it('treats a dialog as a control, so the space bar does not start the game behind an open menu', () => {
      expect(INTERACTIVE).toContain('[role="dialog"]');
   });
});
