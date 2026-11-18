import { describe, expect, it } from 'vitest';

import { BOT_SECONDS, BOT_SEEDS, BOT_TIMEOUT, makeWorld, playCourse } from './helpers';

describe('a bot plays the whole course at desktop width', () => {
   it.each(BOT_SEEDS)(
      'seed %i',
      async (seed) => {
         const { survived, seconds } = await playCourse(seed, BOT_SECONDS, makeWorld());
         expect(survived, `seed ${seed}: no way past the moment at ${seconds.toFixed(2)} s`).toBe(
            true,
         );
      },
      BOT_TIMEOUT,
   );
});
