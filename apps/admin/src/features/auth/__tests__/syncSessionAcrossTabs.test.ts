import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
   LATEST_SESSION_STORAGE_KEY,
   syncWithLatestStoredSession,
} from '@/features/auth/auth-query';

import { syncSessionAcrossTabs } from '../side-effects/syncSessionAcrossTabs';

vi.mock('@/features/auth/auth-query', async (importOriginal) => ({
   ...(await importOriginal<typeof import('@/features/auth/auth-query')>()),
   syncWithLatestStoredSession: vi.fn(),
}));

const fakeWindow = new EventTarget();

const storageEvent = (key: string | null) => Object.assign(new Event('storage'), { key });

beforeEach(() => {
   vi.stubGlobal('window', fakeWindow);
   vi.mocked(syncWithLatestStoredSession).mockClear();
});

afterEach(() => {
   vi.unstubAllGlobals();
});

describe('syncSessionAcrossTabs', () => {
   it('should follow a change of the stored session only', () => {
      const stop = syncSessionAcrossTabs();

      fakeWindow.dispatchEvent(storageEvent('REACT_QUERY_OFFLINE_CACHE'));
      fakeWindow.dispatchEvent(storageEvent('mm-admin-chat'));
      expect(syncWithLatestStoredSession).not.toHaveBeenCalled();

      fakeWindow.dispatchEvent(storageEvent(LATEST_SESSION_STORAGE_KEY));
      expect(syncWithLatestStoredSession).toHaveBeenCalledTimes(1);
      stop();
   });

   it('should stop listening once stopped', () => {
      syncSessionAcrossTabs()();

      fakeWindow.dispatchEvent(storageEvent(LATEST_SESSION_STORAGE_KEY));

      expect(syncWithLatestStoredSession).not.toHaveBeenCalled();
   });
});
