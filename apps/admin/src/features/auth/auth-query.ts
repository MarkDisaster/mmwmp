import type { AuthResponseEntity } from '@/api/generated';
import { getTokenSubject } from '@/features/auth/utils/tokenSubject';
import { queryClient } from '@/utils/query-client';

export const AUTH_QUERY_KEY = ['AUTH'] as const;

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const LATEST_SESSION_STORAGE_KEY = 'auth-latest-session';

export const getAuthSession = () =>
   queryClient.getQueryData<AuthResponseEntity | null>(AUTH_QUERY_KEY);

export const saveAuthSession = (session: AuthResponseEntity) => {
   queryClient.setQueryData<AuthResponseEntity>(AUTH_QUERY_KEY, session);
   try {
      localStorage.setItem(LATEST_SESSION_STORAGE_KEY, JSON.stringify(session));
   } catch {
      // Storage full or blocked: the tab keeps working, only the other tabs miss the update.
   }
};

const isAuthSession = (value: unknown): value is AuthResponseEntity => {
   const session = value as Partial<AuthResponseEntity> | null;
   return (
      typeof session?.accessToken === 'string' &&
      typeof session.refreshToken === 'string' &&
      typeof session.expiresAt === 'string'
   );
};

export const readLatestStoredSession = (): AuthResponseEntity | null => {
   try {
      const session: unknown = JSON.parse(
         localStorage.getItem(LATEST_SESSION_STORAGE_KEY) ?? 'null',
      );
      return isAuthSession(session) ? session : null;
   } catch {
      return null;
   }
};

export const isNewerSession = (candidate: AuthResponseEntity, session: AuthResponseEntity) =>
   Date.parse(candidate.expiresAt) > Date.parse(session.expiresAt);

export const isOtherUsersSession = (candidate: AuthResponseEntity, session: AuthResponseEntity) => {
   const candidateUser = getTokenSubject(candidate.accessToken);
   const sessionUser = getTokenSubject(session.accessToken);
   return candidateUser !== null && sessionUser !== null && candidateUser !== sessionUser;
};

export type AuthSessionEndReason = 'logout' | 'ended';

let lastSessionEndReason: AuthSessionEndReason | null = null;

export const getAuthSessionEndReason = () => lastSessionEndReason;

const sessionEndListeners = new Set<() => void>();

export const onAuthSessionEnd = (listener: () => void) => {
   sessionEndListeners.add(listener);
   return () => {
      sessionEndListeners.delete(listener);
   };
};

const notifySessionEnd = () => sessionEndListeners.forEach((listener) => listener());

export const endAuthSession = ({ reason = 'ended' }: { reason?: AuthSessionEndReason } = {}) => {
   const current = getAuthSession();
   lastSessionEndReason = reason;
   queryClient.setQueryData(AUTH_QUERY_KEY, null);
   queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== AUTH_QUERY_KEY[0] });
   queryClient.getMutationCache().clear();
   notifySessionEnd();

   const stored = readLatestStoredSession();
   if (!current || (stored && isOtherUsersSession(stored, current))) return;
   try {
      localStorage.removeItem(LATEST_SESSION_STORAGE_KEY);
   } catch {
      // Storage blocked: nothing was stored either.
   }
};

export const syncWithLatestStoredSession = () => {
   const current = getAuthSession();
   if (!current) return;
   const stored = readLatestStoredSession();
   if (!stored || isOtherUsersSession(stored, current)) endAuthSession();
};

const isRefreshable = (session: AuthResponseEntity) =>
   Date.parse(session.expiresAt) + REFRESH_TOKEN_TTL_MS > Date.now();

export const restoreLatestStoredSession = () => {
   const stored = readLatestStoredSession();
   if (!stored || !isRefreshable(stored)) return;
   const restored = getAuthSession();
   const isOtherUser = !restored || isOtherUsersSession(stored, restored);
   if (!isOtherUser && !isNewerSession(stored, restored)) return;

   queryClient.setQueryData(AUTH_QUERY_KEY, stored);
   if (isOtherUser) notifySessionEnd();
};
