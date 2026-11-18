import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSingleFlight } from '../singleFlight';

const deferred = <T>() => {
   let resolve!: (value: T) => void;
   let reject!: (reason: unknown) => void;
   const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
   });
   return { promise, resolve, reject };
};

const LOCK = { name: 'auth-refresh', timeoutMs: 1_000 };

afterEach(() => {
   vi.unstubAllGlobals();
});

describe('createSingleFlight', () => {
   it('should share one run between calls made while it is in flight', async () => {
      const run = deferred<string>();
      const task = vi.fn(() => run.promise);
      const refresh = createSingleFlight(task);

      const first = refresh();
      const second = refresh();
      run.resolve('session');

      await expect(Promise.all([first, second])).resolves.toEqual(['session', 'session']);
      expect(task).toHaveBeenCalledTimes(1);
   });

   it('should start a new run once the previous one resolved', async () => {
      const task = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');
      const refresh = createSingleFlight<string>(task);

      await expect(refresh()).resolves.toBe('first');
      await expect(refresh()).resolves.toBe('second');
      expect(task).toHaveBeenCalledTimes(2);
   });

   it('should reject every waiting call and start a new run after a failure', async () => {
      const task = vi
         .fn<() => Promise<string>>()
         .mockRejectedValueOnce(new Error('offline'))
         .mockResolvedValueOnce('session');
      const refresh = createSingleFlight(task);

      const results = await Promise.allSettled([refresh(), refresh()]);
      expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
      await expect(refresh()).resolves.toBe('session');
      expect(task).toHaveBeenCalledTimes(2);
   });

   it('should hold the named Web Lock while the task runs', async () => {
      const request = vi.fn(
         (_name: string, _options: LockOptions, callback: () => Promise<string>) => callback(),
      );
      vi.stubGlobal('navigator', { locks: { request } });
      const refresh = createSingleFlight(() => Promise.resolve('session'), LOCK);

      await expect(refresh()).resolves.toBe('session');
      expect(request).toHaveBeenCalledWith(
         LOCK.name,
         { signal: expect.any(AbortSignal) },
         expect.any(Function),
      );
   });

   it('should stop waiting for a lock that another holder keeps too long', async () => {
      const request = vi.fn(
         (_name: string, options: LockOptions) =>
            new Promise((_resolve, reject) => {
               options.signal?.addEventListener('abort', () => reject(options.signal?.reason));
            }),
      );
      vi.stubGlobal('navigator', { locks: { request } });
      const task = vi.fn(() => Promise.resolve('session'));
      const refresh = createSingleFlight(task, { name: LOCK.name, timeoutMs: 10 });

      await expect(refresh()).rejects.toMatchObject({ name: 'TimeoutError' });
      expect(task).not.toHaveBeenCalled();
   });

   it('should run the task without a lock when navigator.locks is unavailable', async () => {
      vi.stubGlobal('navigator', {});
      const task = vi.fn(() => Promise.resolve('session'));
      const refresh = createSingleFlight(task, LOCK);

      await expect(refresh()).resolves.toBe('session');
      expect(task).toHaveBeenCalledTimes(1);
   });

   it.skipIf(typeof navigator === 'undefined' || !navigator.locks)(
      'should run the tasks of two instances one after another under the same lock',
      async () => {
         const sharedLock = { name: 'single-flight-test', timeoutMs: 1_000 };
         const order: string[] = [];
         const firstRun = deferred<void>();
         const tabA = createSingleFlight(async () => {
            order.push('a:start');
            await firstRun.promise;
            order.push('a:end');
         }, sharedLock);
         const tabB = createSingleFlight(async () => {
            order.push('b:start');
         }, sharedLock);

         const a = tabA();
         const b = tabB();
         await Promise.resolve();
         firstRun.resolve();
         await Promise.all([a, b]);

         expect(order).toEqual(['a:start', 'a:end', 'b:start']);
      },
   );
});
