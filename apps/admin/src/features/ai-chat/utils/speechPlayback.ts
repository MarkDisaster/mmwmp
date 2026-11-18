import i18n from 'i18next';
import { toast } from 'sonner';

import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';

import { pickVoice, toSpeechLocale } from './speech';

const VOICES_TIMEOUT_MS = 500;

type Playback = { owner: string };

let active: Playback | null = null;
const listeners = new Set<() => void>();

const isSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

const setActive = (next: Playback | null) => {
   active = next;
   useAiChatStore.getState().setIsTtsSpeaking(next !== null);
   listeners.forEach((listener) => listener());
};

const finish = (playback: Playback) => {
   if (active === playback) setActive(null);
};

const waitForVoices = () => {
   const synth = window.speechSynthesis;
   if (synth.getVoices().length > 0) return Promise.resolve();
   return new Promise<void>((resolve) => {
      const done = () => {
         clearTimeout(timer);
         synth.removeEventListener('voiceschanged', done);
         resolve();
      };
      const timer = setTimeout(done, VOICES_TIMEOUT_MS);
      synth.addEventListener('voiceschanged', done, { once: true });
   });
};

export const subscribeToSpeech = (listener: () => void) => {
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
};

export const getSpeakingOwner = () => active?.owner ?? null;

export const stopSpeech = (owner: string) => {
   if (active?.owner !== owner) return;
   setActive(null);
   window.speechSynthesis.cancel();
};

export const speak = async (owner: string, text: string) => {
   const trimmed = text.trim();
   if (!trimmed) return;
   if (!isSupported()) {
      toast.error(i18n.t('chat.voice.errors.playbackUnsupported'));
      return;
   }

   const playback: Playback = { owner };
   if (active) window.speechSynthesis.cancel();
   setActive(playback);

   await waitForVoices();
   if (active !== playback) return;

   const locale = toSpeechLocale(i18n.language);
   const utterance = new SpeechSynthesisUtterance(trimmed);
   utterance.lang = locale;
   const voice = pickVoice(window.speechSynthesis.getVoices(), locale);
   if (voice) utterance.voice = voice;
   utterance.onend = () => finish(playback);
   utterance.onerror = (event) => {
      if (active !== playback) return;
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
         toast.error(i18n.t('chat.voice.errors.playbackFailed'));
      }
      finish(playback);
   };
   window.speechSynthesis.speak(utterance);
};
