import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthResponseEntity } from '@/api/generated';
import { AUTH_QUERY_KEY } from '@/features/auth/auth-query';
import { refreshSession } from '@/utils/axios';
import { queryClient } from '@/utils/query-client';

import { refreshAccessToken } from '../side-effects/refreshAccessToken';

vi.mock('@/utils/axios', () => ({ refreshSession: vi.fn(() => Promise.resolve(null)) }));

const MINUTE_MS = 60 * 1000;

const session = (expiresInMs: number): AuthResponseEntity => ({
   accessToken: 'access',
   refreshToken: 'refresh',
   expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
});

let stop: (() => void) | null = null;

beforeEach(() => {
   vi.useFakeTimers();
   queryClient.clear();
   vi.mocked(refreshSession).mockClear();
});

afterEach(() => {
   stop?.();
   stop = null;
   vi.useRealTimers();
});

describe('refreshAccessToken', () => {
   it('should arm the timer for the session that is already in the cache (a reload)', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session(15 * MINUTE_MS));
      stop = refreshAccessToken();

      await vi.advanceTimersByTimeAsync(10 * MINUTE_MS - 1);
      expect(refreshSession).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(refreshSession).toHaveBeenCalledTimes(1);
   });

   it('should refresh at once when the restored session expires within the margin', () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session(2 * MINUTE_MS));
      stop = refreshAccessToken();

      expect(refreshSession).toHaveBeenCalledTimes(1);
   });

   it('should re-arm the timer for a session saved later (a sign-in)', async () => {
      stop = refreshAccessToken();
      queryClient.setQueryData(AUTH_QUERY_KEY, session(20 * MINUTE_MS));

      await vi.advanceTimersByTimeAsync(15 * MINUTE_MS);
      expect(refreshSession).toHaveBeenCalledTimes(1);
   });

   it('should not refresh again for a later notification with the same expiry', () => {
      const restored = session(2 * MINUTE_MS);
      queryClient.setQueryData(AUTH_QUERY_KEY, restored);
      stop = refreshAccessToken();
      queryClient.setQueryData(AUTH_QUERY_KEY, { ...restored, accessToken: 'same-expiry' });

      expect(refreshSession).toHaveBeenCalledTimes(1);
   });

   it('should cancel the timer when the session ends', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session(15 * MINUTE_MS));
      stop = refreshAccessToken();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);

      await vi.advanceTimersByTimeAsync(15 * MINUTE_MS);
      expect(refreshSession).not.toHaveBeenCalled();
   });
});
