import {
   LATEST_SESSION_STORAGE_KEY,
   syncWithLatestStoredSession,
} from '@/features/auth/auth-query';

export const syncSessionAcrossTabs = () => {
   const handleStorage = (event: StorageEvent) => {
      if (event.key === LATEST_SESSION_STORAGE_KEY) syncWithLatestStoredSession();
   };

   window.addEventListener('storage', handleStorage);
   return () => window.removeEventListener('storage', handleStorage);
};
