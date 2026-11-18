export type Random = () => number;

export type RandomState = { rng: number };

export function nextRandom(holder: RandomState): number {
   holder.rng = (holder.rng + 0x6d2b79f5) >>> 0;
   let t = holder.rng;
   t = Math.imul(t ^ (t >>> 15), t | 1);
   t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
   return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createRandom(seed: number): Random {
   const holder = { rng: seed >>> 0 };
   return () => nextRandom(holder);
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 32);
