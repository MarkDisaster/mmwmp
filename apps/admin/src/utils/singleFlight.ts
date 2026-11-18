type WebLockOptions = {
   name: string;
   timeoutMs: number;
};

const runExclusive = async <T>(task: () => Promise<T>, lock?: WebLockOptions): Promise<T> => {
   const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
   if (!lock || !locks) return task();
   return locks.request(lock.name, { signal: AbortSignal.timeout(lock.timeoutMs) }, task);
};

export const createSingleFlight = <T>(task: () => Promise<T>, lock?: WebLockOptions) => {
   let inFlight: Promise<T> | null = null;

   return (): Promise<T> => {
      inFlight ??= runExclusive(task, lock).finally(() => {
         inFlight = null;
      });
      return inFlight;
   };
};
