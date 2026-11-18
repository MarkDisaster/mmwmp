import { BEST_TIME_KEY } from '../engine/constants';

function readNumber(key: string): number {
   try {
      return Number(localStorage.getItem(key)) || 0;
   } catch {
      return 0;
   }
}

function saveNumber(key: string, value: number): void {
   try {
      localStorage.setItem(key, String(Math.floor(value)));
   } catch {
      // Storage can be blocked (private mode) — the record just isn't kept.
   }
}

const NICK_KEY = 'mm-runner-nick';

export function readNick(): string {
   try {
      return localStorage.getItem(NICK_KEY) ?? '';
   } catch {
      return '';
   }
}

export function saveNick(nick: string): void {
   try {
      localStorage.setItem(NICK_KEY, nick);
   } catch {
      // Blocked storage: the nickname is typed again next time.
   }
}

const RETIRED_KEYS = ['mm-runner-seen', 'mm-runner-hi'];

export class PlayerRecord {
   bestTime = readNumber(BEST_TIME_KEY);

   constructor() {
      try {
         for (const key of RETIRED_KEYS) localStorage.removeItem(key);
      } catch {
         // Blocked storage holds nothing to clear.
      }
   }

   finishRun(seconds: number): void {
      if (seconds <= this.bestTime) return;
      this.bestTime = seconds;
      saveNumber(BEST_TIME_KEY, seconds);
   }
}
