import { describe, expect, it } from 'vitest';

import {
   BOT_SECONDS,
   FAIR_SEEDS,
   FAIR_TIMEOUT,
   makeWorld,
   MIN_WINDOW,
   MOBILE_WIDTH,
   playCourse,
} from './helpers';

describe('every jump leaves a person time at mobile width', () => {
   it.each(FAIR_SEEDS)(
      'seed %i',
      async (seed) => {
         const { survived, seconds, window } = await playCourse(
            seed,
            BOT_SECONDS,
            makeWorld({ width: MOBILE_WIDTH, mobile: true }),
            { fair: true },
         );
         const why =
            window === undefined
               ? `no way past the moment at ${seconds.toFixed(2)} s`
               : `the jump at ${seconds.toFixed(2)} s works only within ${Math.round(window * 1000)} ms (needs ${Math.round(MIN_WINDOW * 1000)} ms)`;
         expect(survived, `seed ${seed}: ${why}`).toBe(true);
      },
      FAIR_TIMEOUT,
   );
});
