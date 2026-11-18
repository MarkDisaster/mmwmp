import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { setIsTtsSpeaking, toastError } = vi.hoisted(() => ({
   setIsTtsSpeaking: vi.fn(),
   toastError: vi.fn(),
}));

vi.mock('@/features/ai-chat/hooks/useAiChatStore', () => ({
   useAiChatStore: { getState: () => ({ setIsTtsSpeaking }) },
}));
vi.mock('sonner', () => ({ toast: { error: toastError } }));

type FakeUtterance = {
   text: string;
   lang: string;
   voice: unknown;
   onend: (() => void) | null;
   onerror: ((event: { error: string }) => void) | null;
};

const spoken: FakeUtterance[] = [];
const synth = {
   voices: [{ lang: 'cs-CZ' }] as { lang: string }[],
   getVoices: () => synth.voices,
   speak: (utterance: FakeUtterance) => spoken.push(utterance),
   cancel: vi.fn(),
   addEventListener: vi.fn(),
   removeEventListener: vi.fn(),
};

class Utterance implements FakeUtterance {
   lang = '';
   voice: unknown = null;
   onend: (() => void) | null = null;
   onerror: ((event: { error: string }) => void) | null = null;
   constructor(public text: string) {}
}

vi.stubGlobal('window', { speechSynthesis: synth });
vi.stubGlobal('SpeechSynthesisUtterance', Utterance);

const { getSpeakingOwner, speak, stopSpeech, subscribeToSpeech } =
   await import('../utils/speechPlayback');

const lastUtterance = () => spoken[spoken.length - 1];

describe('speechPlayback', () => {
   beforeEach(() => {
      spoken.length = 0;
      synth.voices = [{ lang: 'cs-CZ' }];
      vi.clearAllMocks();
   });

   afterEach(() => {
      stopSpeech(getSpeakingOwner() ?? '');
      vi.useRealTimers();
   });

   it('should mark the owner as speaking until its utterance ends', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToSpeech(listener);

      await speak('a', 'Dobrý den');
      expect(getSpeakingOwner()).toBe('a');
      expect(setIsTtsSpeaking).toHaveBeenLastCalledWith(true);
      expect(lastUtterance()?.text).toBe('Dobrý den');

      lastUtterance()?.onend?.();
      expect(getSpeakingOwner()).toBeNull();
      expect(setIsTtsSpeaking).toHaveBeenLastCalledWith(false);
      expect(listener).toHaveBeenCalledTimes(2);
      unsubscribe();
   });

   it('should ignore the interrupted event of a replaced utterance', async () => {
      await speak('a', 'První');
      const first = lastUtterance();
      await speak('b', 'Druhá');

      first?.onerror?.({ error: 'interrupted' });
      expect(getSpeakingOwner()).toBe('b');
      expect(setIsTtsSpeaking).not.toHaveBeenCalledWith(false);
      expect(toastError).not.toHaveBeenCalled();
   });

   it('should let an owner stop only its own playback', async () => {
      await speak('a', 'Text');

      stopSpeech('b');
      expect(getSpeakingOwner()).toBe('a');
      expect(synth.cancel).not.toHaveBeenCalled();

      stopSpeech('a');
      expect(getSpeakingOwner()).toBeNull();
      expect(synth.cancel).toHaveBeenCalledTimes(1);
   });

   it('should speak only the latest request while the voices are loading', async () => {
      vi.useFakeTimers();
      synth.voices = [];

      const first = speak('a', 'První');
      const second = speak('b', 'Druhá');
      await vi.runAllTimersAsync();
      await Promise.all([first, second]);

      expect(spoken.map((u) => u.text)).toEqual(['Druhá']);
      expect(getSpeakingOwner()).toBe('b');
      expect(vi.getTimerCount()).toBe(0);
   });

   it('should not speak a request stopped while the voices are loading', async () => {
      vi.useFakeTimers();
      synth.voices = [];

      const pending = speak('a', 'Text');
      stopSpeech('a');
      await vi.runAllTimersAsync();
      await pending;

      expect(spoken).toHaveLength(0);
      expect(getSpeakingOwner()).toBeNull();
   });

   it('should report a real playback error and end the playback', async () => {
      await speak('a', 'Text');

      lastUtterance()?.onerror?.({ error: 'synthesis-failed' });
      expect(toastError).toHaveBeenCalledTimes(1);
      expect(getSpeakingOwner()).toBeNull();
   });

   it('should skip empty text', async () => {
      await speak('a', '   ');
      expect(spoken).toHaveLength(0);
      expect(getSpeakingOwner()).toBeNull();
   });
});
