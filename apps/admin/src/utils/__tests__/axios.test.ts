import type { InternalAxiosRequestConfig } from 'axios';
import axiosLib, { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthResponseEntity } from '@/api/generated';
import {
   AUTH_QUERY_KEY,
   endAuthSession,
   getAuthSession,
   getAuthSessionEndReason,
   restoreLatestStoredSession,
   syncWithLatestStoredSession,
} from '@/features/auth/auth-query';

import { api, refreshSession, revokeSession } from '../axios';
import { queryClient } from '../query-client';

const LATEST_SESSION_STORAGE_KEY = 'auth-latest-session';
const HOUR_MS = 60 * 60 * 1000;

const accessTokenOf = (userId: number) =>
   `header.${btoa(JSON.stringify({ sub: userId })).replace(/=+$/u, '')}.signature`;

const session = (name: string, expiresInMs: number, userId?: number): AuthResponseEntity => ({
   accessToken: userId === undefined ? `access-${name}` : accessTokenOf(userId),
   refreshToken: `refresh-${name}`,
   expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
});

const response = <T>(status: number, data: T, config?: InternalAxiosRequestConfig) => ({
   status,
   statusText: '',
   data,
   headers: {},
   config: config ?? { headers: new AxiosHeaders() },
});

const httpError = (status: number, config?: InternalAxiosRequestConfig) =>
   new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, response(status, null, config));

const createMemoryStorage = (): Storage => {
   const items = new Map<string, string>();
   return {
      get length() {
         return items.size;
      },
      clear: () => items.clear(),
      getItem: (key) => items.get(key) ?? null,
      key: (index) => [...items.keys()][index] ?? null,
      removeItem: (key) => {
         items.delete(key);
      },
      setItem: (key, value) => {
         items.set(key, value);
      },
   };
};

const storeSessionOfAnotherTab = (stored: AuthResponseEntity) =>
   localStorage.setItem(LATEST_SESSION_STORAGE_KEY, JSON.stringify(stored));

beforeEach(() => {
   vi.stubGlobal('localStorage', createMemoryStorage());
   queryClient.clear();
});

afterEach(() => {
   vi.restoreAllMocks();
   vi.unstubAllGlobals();
   api.defaults.adapter = undefined;
});

describe('refreshSession', () => {
   it('should send one refresh request for concurrent callers and store the new session', async () => {
      const current = session('current', HOUR_MS);
      const next = session('next', 2 * HOUR_MS);
      queryClient.setQueryData(AUTH_QUERY_KEY, current);
      const post = vi.spyOn(axiosLib, 'post').mockResolvedValue(response(201, next));

      const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

      expect(results).toEqual([next, next, next]);
      expect(post).toHaveBeenCalledTimes(1);
      expect(post).toHaveBeenCalledWith(
         expect.stringMatching(/\/auth\/refresh$/),
         { refreshToken: current.refreshToken },
         { timeout: 10_000 },
      );
      expect(getAuthSession()).toEqual(next);
      expect(JSON.parse(localStorage.getItem(LATEST_SESSION_STORAGE_KEY) ?? 'null')).toEqual(next);
   });

   it('should take over the newer session another tab stored instead of sending a revoked token', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('current', 60_000));
      const rotated = session('rotated', HOUR_MS);
      storeSessionOfAnotherTab(rotated);
      const post = vi.spyOn(axiosLib, 'post');

      await expect(refreshSession()).resolves.toEqual(rotated);

      expect(post).not.toHaveBeenCalled();
      expect(getAuthSession()).toEqual(rotated);
   });

   it('should refresh with the stored refresh token when the stored access token expired too', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('current', -2 * HOUR_MS));
      const rotated = session('rotated', -HOUR_MS);
      storeSessionOfAnotherTab(rotated);
      const next = session('next', HOUR_MS);
      const post = vi.spyOn(axiosLib, 'post').mockResolvedValue(response(201, next));

      await expect(refreshSession()).resolves.toEqual(next);

      expect(post).toHaveBeenCalledWith(
         expect.any(String),
         { refreshToken: rotated.refreshToken },
         expect.anything(),
      );
   });

   it('should ignore an older stored session', async () => {
      const current = session('current', HOUR_MS);
      queryClient.setQueryData(AUTH_QUERY_KEY, current);
      storeSessionOfAnotherTab(session('older', 60_000));
      const post = vi
         .spyOn(axiosLib, 'post')
         .mockResolvedValue(response(201, session('next', 2 * HOUR_MS)));

      await refreshSession();

      expect(post).toHaveBeenCalledWith(
         expect.any(String),
         { refreshToken: current.refreshToken },
         expect.anything(),
      );
   });

   it('should end the session instead of taking over the session of another user', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('current', 60_000, 1));
      const otherUser = session('other', HOUR_MS, 2);
      storeSessionOfAnotherTab(otherUser);
      const post = vi.spyOn(axiosLib, 'post');

      await expect(refreshSession()).resolves.toBeNull();

      expect(post).not.toHaveBeenCalled();
      expect(getAuthSession()).toBeNull();
      expect(JSON.parse(localStorage.getItem(LATEST_SESSION_STORAGE_KEY) ?? 'null')).toEqual(
         otherUser,
      );
   });

   it('should end the session and drop the cached data when the API rejects the refresh token', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('current', HOUR_MS));
      queryClient.setQueryData(['projects', 'list', undefined], { data: [], totalCount: 0 });
      vi.spyOn(axiosLib, 'post').mockRejectedValue(httpError(401));

      await expect(refreshSession()).resolves.toBeNull();

      expect(getAuthSession()).toBeNull();
      expect(queryClient.getQueryData(['projects', 'list', undefined])).toBeUndefined();
   });

   it('should keep the session when the API cannot be reached', async () => {
      const current = session('current', HOUR_MS);
      queryClient.setQueryData(AUTH_QUERY_KEY, current);
      vi.spyOn(axiosLib, 'post').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));

      await expect(refreshSession()).rejects.toThrow('Network Error');

      expect(getAuthSession()).toEqual(current);
   });
});

describe('syncWithLatestStoredSession', () => {
   it('should sign the tab out when another tab signed out', () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('current', HOUR_MS, 1));

      syncWithLatestStoredSession();

      expect(getAuthSession()).toBeNull();
   });

   it('should sign the tab out and keep the stored session when another user signed in', () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('current', HOUR_MS, 1));
      const otherUser = session('other', HOUR_MS, 2);
      storeSessionOfAnotherTab(otherUser);

      syncWithLatestStoredSession();

      expect(getAuthSession()).toBeNull();
      expect(JSON.parse(localStorage.getItem(LATEST_SESSION_STORAGE_KEY) ?? 'null')).toEqual(
         otherUser,
      );
   });

   it('should keep the session when the same user refreshed in another tab', () => {
      const current = session('current', HOUR_MS, 1);
      queryClient.setQueryData(AUTH_QUERY_KEY, current);
      storeSessionOfAnotherTab(session('rotated', 2 * HOUR_MS, 1));

      syncWithLatestStoredSession();

      expect(getAuthSession()).toEqual(current);
   });
});

describe('endAuthSession', () => {
   it('should remove the stored session of the signed-out user', () => {
      const current = session('current', HOUR_MS, 1);
      queryClient.setQueryData(AUTH_QUERY_KEY, current);
      storeSessionOfAnotherTab(current);

      endAuthSession();

      expect(localStorage.getItem(LATEST_SESSION_STORAGE_KEY)).toBeNull();
   });
});

describe('endAuthSession reason', () => {
   it('should tell a sign-out by the user from a session that ended without them', () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('current', HOUR_MS, 1));
      endAuthSession({ reason: 'logout' });
      expect(getAuthSessionEndReason()).toBe('logout');

      queryClient.setQueryData(AUTH_QUERY_KEY, session('next', HOUR_MS, 1));
      endAuthSession();
      expect(getAuthSessionEndReason()).toBe('ended');
   });
});

describe('restoreLatestStoredSession', () => {
   it('should take over the stored session when another tab persisted null over it', () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      const stored = session('stored', HOUR_MS, 2);
      storeSessionOfAnotherTab(stored);

      restoreLatestStoredSession();

      expect(getAuthSession()).toEqual(stored);
   });

   it('should take over a newer stored session or the session of another user', () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('restored', HOUR_MS, 1));
      const newer = session('newer', 2 * HOUR_MS, 1);
      storeSessionOfAnotherTab(newer);
      restoreLatestStoredSession();
      expect(getAuthSession()).toEqual(newer);

      const otherUser = session('other', HOUR_MS, 2);
      storeSessionOfAnotherTab(otherUser);
      restoreLatestStoredSession();
      expect(getAuthSession()).toEqual(otherUser);
   });

   it('should keep the restored session when the stored one is older', () => {
      const restored = session('restored', 2 * HOUR_MS, 1);
      queryClient.setQueryData(AUTH_QUERY_KEY, restored);
      storeSessionOfAnotherTab(session('older', HOUR_MS, 1));

      restoreLatestStoredSession();

      expect(getAuthSession()).toEqual(restored);
   });

   it('should not bring back a session the user signed out of', () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('current', HOUR_MS, 1));
      storeSessionOfAnotherTab(session('current', HOUR_MS, 1));
      endAuthSession({ reason: 'logout' });

      restoreLatestStoredSession();

      expect(getAuthSession()).toBeNull();
   });

   it('should ignore a stored session whose refresh token has expired', () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      storeSessionOfAnotherTab(session('stale', -8 * 24 * HOUR_MS, 1));

      restoreLatestStoredSession();

      expect(getAuthSession()).toBeNull();
   });
});

describe('revokeSession', () => {
   it('should revoke the newest refresh token of the user while holding the refresh lock', async () => {
      const request = vi.fn((_name: string, _options: LockOptions, callback: () => Promise<void>) =>
         callback(),
      );
      vi.stubGlobal('navigator', { locks: { request } });
      queryClient.setQueryData(AUTH_QUERY_KEY, session('current', 60_000, 1));
      const rotated = session('rotated', HOUR_MS, 1);
      storeSessionOfAnotherTab(rotated);
      const post = vi.spyOn(axiosLib, 'post').mockResolvedValue(response(201, null));

      await revokeSession();

      expect(request).toHaveBeenCalledWith('auth-refresh', expect.anything(), expect.any(Function));
      expect(post).toHaveBeenCalledWith(
         expect.stringMatching(/\/auth\/logout$/),
         { refreshToken: rotated.refreshToken },
         expect.objectContaining({ headers: { Authorization: `Bearer ${rotated.accessToken}` } }),
      );
   });

   it('should not send the token of another user', async () => {
      const current = session('current', 60_000, 1);
      queryClient.setQueryData(AUTH_QUERY_KEY, current);
      storeSessionOfAnotherTab(session('other', HOUR_MS, 2));
      const post = vi.spyOn(axiosLib, 'post').mockResolvedValue(response(201, null));

      await revokeSession();

      expect(post).toHaveBeenCalledWith(
         expect.any(String),
         { refreshToken: current.refreshToken },
         expect.anything(),
      );
   });

   it('should revoke without the Web Locks API as well', async () => {
      vi.stubGlobal('navigator', {});
      queryClient.setQueryData(AUTH_QUERY_KEY, session('current', HOUR_MS, 1));
      const post = vi.spyOn(axiosLib, 'post').mockResolvedValue(response(201, null));

      await revokeSession();

      expect(post).toHaveBeenCalledTimes(1);
   });
});

describe('api 401 handling', () => {
   const answerByToken = (validToken: string) =>
      vi.fn(async (config: InternalAxiosRequestConfig) => {
         if (config.headers.Authorization !== `Bearer ${validToken}`) throw httpError(401, config);
         return response(200, 'ok', config);
      });

   it('should refresh and repeat a request answered 401 once', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('expired', -60_000));
      const next = session('next', HOUR_MS);
      vi.spyOn(axiosLib, 'post').mockResolvedValue(response(201, next));
      const adapter = answerByToken(next.accessToken);
      api.defaults.adapter = adapter;

      await expect(api.get('/projects').then((r) => r.data)).resolves.toBe('ok');
      expect(adapter).toHaveBeenCalledTimes(2);
   });

   it('should end the session when the repeated request is answered 401 as well', async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session('expired', -60_000));
      vi.spyOn(axiosLib, 'post').mockResolvedValue(response(201, session('next', HOUR_MS)));
      api.defaults.adapter = answerByToken('never-valid');

      await expect(api.get('/projects')).rejects.toBeInstanceOf(AxiosError);
      expect(getAuthSession()).toBeNull();
   });

   it('should pass a 401 of an auth endpoint through without refreshing', async () => {
      const current = session('current', HOUR_MS);
      queryClient.setQueryData(AUTH_QUERY_KEY, current);
      const post = vi.spyOn(axiosLib, 'post');
      api.defaults.adapter = answerByToken('never-valid');

      await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError);
      expect(post).not.toHaveBeenCalled();
      expect(getAuthSession()).toEqual(current);
   });
});
