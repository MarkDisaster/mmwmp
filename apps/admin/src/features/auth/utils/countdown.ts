export const getRemainingSeconds = (deadline: number, now: number): number =>
   Math.max(0, Math.ceil((deadline - now) / 1000));
