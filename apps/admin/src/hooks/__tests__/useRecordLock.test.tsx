import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signInAs } from '@/test/auth';
import { ADMIN_ROLE, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { useRecordLock } from '../useRecordLock';

const acquire = vi.hoisted(() => vi.fn());
const release = vi.hoisted(() => vi.fn());

vi.mock('@/api', async (importOriginal) => {
   const actual = await importOriginal<typeof import('@/api')>();
   const { mutations } = actual.api.editLocks;
   return {
      ...actual,
      api: {
         ...actual.api,
         editLocks: {
            ...actual.api.editLocks,
            mutations: {
               acquire: { ...mutations.acquire, mutationFn: acquire },
               release: { ...mutations.release, mutationFn: release },
            },
         },
      },
   };
});

const ME = 10;
const JANA = { userId: 3, name: 'Jana Nováková', since: '2026-11-12T14:02:00.000Z' };
const HEARTBEAT_MS = 20_000;

const held = (holder: typeof JANA | null, mine = false) => ({ heldBy: holder, mine });

const mountLock = () => renderHook(() => useRecordLock('projects', 5), { wrapper: QueryWrapper });

const flush = () => act(() => vi.advanceTimersByTimeAsync(0));

describe('useRecordLock', () => {
   beforeEach(() => {
      vi.useFakeTimers();
      acquire.mockReset().mockResolvedValue(held({ ...JANA, userId: ME, name: 'Me' }, true));
      release.mockReset().mockResolvedValue(undefined);
      signInAs(createUser(ADMIN_ROLE, { id: ME }));
   });

   afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      queryClient.clear();
   });

   it('should take the lock on mount and renew it every 20 seconds', async () => {
      mountLock();
      await flush();
      expect(acquire).toHaveBeenCalledTimes(1);
      expect(acquire.mock.calls[0][0]).toMatchObject({
         entity: 'projects',
         id: 5,
         takeOver: false,
         sessionId: expect.any(String),
      });

      await act(() => vi.advanceTimersByTimeAsync(HEARTBEAT_MS));
      expect(acquire).toHaveBeenCalledTimes(2);
      await act(() => vi.advanceTimersByTimeAsync(HEARTBEAT_MS));
      expect(acquire).toHaveBeenCalledTimes(3);
   });

   it('should release the lock with the same tab id and stop renewing when the editor closes', async () => {
      const { unmount } = mountLock();
      await flush();
      const { sessionId } = acquire.mock.calls[0][0];

      unmount();
      await flush();

      expect(release).toHaveBeenCalledTimes(1);
      expect(release.mock.calls[0][0]).toEqual({ entity: 'projects', id: 5, sessionId });
      await act(() => vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 3));
      expect(acquire).toHaveBeenCalledTimes(1);
   });

   it('should report whether this tab holds the lock', async () => {
      const { result } = mountLock();
      await flush();

      expect(result.current.mine).toBe(true);
      expect(result.current.heldBy).toBeNull();
   });

   it('should use another tab id for another user who signs in in the same tab', async () => {
      const { rerender } = mountLock();
      await flush();
      const first = acquire.mock.calls[0][0].sessionId;

      act(() => signInAs(createUser(ADMIN_ROLE, { id: 11 })));
      rerender();
      await flush();

      const last = acquire.mock.calls.at(-1)?.[0];
      expect(last.sessionId).not.toBe(first);
      expect(release.mock.calls[0][0].sessionId).toBe(first);
   });

   it('should keep the take over when a heartbeat the server handled earlier answers later', async () => {
      let answerHeartbeat: (lock: ReturnType<typeof held>) => void = () => {};
      acquire.mockResolvedValueOnce(held(JANA));
      const { result } = mountLock();
      await flush();
      expect(result.current.heldBy).toEqual(JANA);

      acquire.mockImplementationOnce(
         () => new Promise((resolve) => (answerHeartbeat = resolve as typeof answerHeartbeat)),
      );
      await act(() => vi.advanceTimersByTimeAsync(HEARTBEAT_MS));
      acquire.mockResolvedValueOnce(held({ ...JANA, userId: ME }, true));
      act(() => result.current.takeOver());
      await flush();
      expect(result.current.heldBy).toBeNull();

      await act(async () => answerHeartbeat(held(JANA)));

      expect(result.current.heldBy).toBeNull();
      expect(result.current.mine).toBe(true);
   });

   it('should report another user who holds the lock', async () => {
      acquire.mockResolvedValue(held(JANA));
      const { result } = mountLock();
      await flush();

      expect(result.current.heldBy).toEqual(JANA);
      expect(result.current.takenOver).toBe(false);
   });

   it('should not report another tab of the same user', async () => {
      acquire.mockResolvedValue(held({ ...JANA, userId: ME }));
      const { result } = mountLock();
      await flush();

      expect(result.current.heldBy).toBeNull();
   });

   it('should tell that the lock was taken over after this editor held it', async () => {
      const { result } = mountLock();
      await flush();
      expect(result.current.heldBy).toBeNull();

      acquire.mockResolvedValue(held(JANA));
      await act(() => vi.advanceTimersByTimeAsync(HEARTBEAT_MS));

      expect(result.current.heldBy).toEqual(JANA);
      expect(result.current.takenOver).toBe(true);
   });

   it('should take the lock over on request', async () => {
      acquire.mockResolvedValue(held(JANA));
      const { result } = mountLock();
      await flush();

      acquire.mockResolvedValue(held({ ...JANA, userId: ME }, true));
      act(() => result.current.takeOver());
      await flush();

      expect(acquire.mock.calls.at(-1)?.[0]).toMatchObject({ takeOver: true });
      expect(result.current.heldBy).toBeNull();
   });

   it('should show nothing and keep going when the lock store fails', async () => {
      acquire.mockRejectedValue(new Error('503'));
      const { result } = mountLock();
      await flush();
      expect(result.current.heldBy).toBeNull();

      acquire.mockResolvedValue(held(JANA));
      await act(() => vi.advanceTimersByTimeAsync(HEARTBEAT_MS));
      expect(result.current.heldBy).toEqual(JANA);
   });

   it('should renew the lock when the tab becomes visible again', async () => {
      mountLock();
      await flush();
      acquire.mockClear();

      act(() => {
         document.dispatchEvent(new Event('visibilitychange'));
      });
      await flush();

      expect(acquire).toHaveBeenCalledTimes(1);
   });

   it('should release the lock with a keepalive request when the page is hidden', async () => {
      const fetchMock = vi.fn().mockResolvedValue({});
      vi.stubGlobal('fetch', fetchMock);
      mountLock();
      await flush();

      act(() => {
         window.dispatchEvent(new Event('pagehide'));
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/edit-locks\/projects\/5$/);
      expect(init).toMatchObject({
         method: 'DELETE',
         keepalive: true,
         headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
      });
      expect(JSON.parse(init.body)).toEqual({ sessionId: acquire.mock.calls[0][0].sessionId });
   });
});
