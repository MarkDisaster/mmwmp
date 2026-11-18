import { useEffect, useState } from 'react';

import { getRemainingSeconds } from '@/features/auth/utils/countdown';

const TICK_MS = 1000;

export const useCountdown = (deadline: number | null): number => {
   const [remaining, setRemaining] = useState(0);

   useEffect(() => {
      if (deadline === null) return;

      const tick = () => {
         const seconds = getRemainingSeconds(deadline, Date.now());
         setRemaining(seconds);
         if (seconds === 0) clearInterval(timerId);
      };

      const timerId = setInterval(tick, TICK_MS);
      tick();

      return () => clearInterval(timerId);
   }, [deadline]);

   return deadline === null ? 0 : remaining;
};
