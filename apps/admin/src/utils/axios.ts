import type { InternalAxiosRequestConfig } from 'axios';
import axiosLib, { HttpStatusCode } from 'axios';
import i18n from 'i18next';

import type { AuthResponseEntity } from '@/api/generated';
import {
   endAuthSession,
   getAuthSession,
   isNewerSession,
   isOtherUsersSession,
   readLatestStoredSession,
   saveAuthSession,
} from '@/features/auth/auth-query';
import { getHttpStatus } from '@/utils/httpError';
import { toLanguageCode } from '@/utils/language';
import { createSingleFlight } from '@/utils/singleFlight';

type RequestConfigWithRetry = InternalAxiosRequestConfig & { _retried?: boolean };

export const API_URL = import.meta.env.VITE_API_URL;

const REFRESH_LOCK_NAME = 'auth-refresh';

const REFRESH_TIMEOUT_MS = 10_000;

const REFRESH_LOCK_TIMEOUT_MS = 2 * REFRESH_TIMEOUT_MS;

const AUTH_ENDPOINT = /^\/auth\//;

export const api = axiosLib.create({
   baseURL: API_URL,
});

const toBearer = (accessToken: string) => `Bearer ${accessToken}`;

const getDefaultHeaders = (): Record<string, string> => {
   const accessToken = getAuthSession()?.accessToken;
   return {
      'Accept-Language': toLanguageCode(i18n.language),
      ...(accessToken ? { Authorization: toBearer(accessToken) } : {}),
   };
};

const requestSessionRefresh = async (): Promise<AuthResponseEntity | null> => {
   const current = getAuthSession();
   if (!current) {
      endAuthSession();
      return null;
   }

   const stored = readLatestStoredSession();
   if (stored && isOtherUsersSession(stored, current)) {
      endAuthSession();
      return null;
   }
   const latest = stored && isNewerSession(stored, current) ? stored : current;
   if (latest !== current && Date.parse(latest.expiresAt) > Date.now()) {
      saveAuthSession(latest);
      return latest;
   }

   try {
      const { data } = await axiosLib.post<AuthResponseEntity>(
         `${API_URL}/auth/refresh`,
         { refreshToken: latest.refreshToken },
         { timeout: REFRESH_TIMEOUT_MS },
      );
      saveAuthSession(data);
      return data;
   } catch (error) {
      if (getHttpStatus(error) !== HttpStatusCode.Unauthorized) throw error;
      endAuthSession();
      return null;
   }
};

export const refreshSession = createSingleFlight(requestSessionRefresh, {
   name: REFRESH_LOCK_NAME,
   timeoutMs: REFRESH_LOCK_TIMEOUT_MS,
});

const requestSessionRevoke = async () => {
   const current = getAuthSession();
   if (!current) return;
   const stored = readLatestStoredSession();
   const latest =
      stored && !isOtherUsersSession(stored, current) && isNewerSession(stored, current)
         ? stored
         : current;
   await axiosLib.post(
      `${API_URL}/auth/logout`,
      { refreshToken: latest.refreshToken },
      { headers: { Authorization: toBearer(latest.accessToken) }, timeout: REFRESH_TIMEOUT_MS },
   );
};

export const revokeSession = createSingleFlight(requestSessionRevoke, {
   name: REFRESH_LOCK_NAME,
   timeoutMs: REFRESH_LOCK_TIMEOUT_MS,
});

const getRetryAccessToken = async (usedAuthorization: unknown): Promise<string | null> => {
   const accessToken = getAuthSession()?.accessToken;
   if (accessToken && toBearer(accessToken) !== usedAuthorization) return accessToken;
   const session = await refreshSession();
   return session?.accessToken ?? null;
};

api.interceptors.request.use((config) => {
   config.headers.set(getDefaultHeaders());
   return config;
});

api.interceptors.response.use(
   (response) => response,
   async (error: unknown) => {
      if (
         !axiosLib.isAxiosError(error) ||
         error.response?.status !== HttpStatusCode.Unauthorized ||
         !error.config ||
         AUTH_ENDPOINT.test(error.config.url ?? '')
      ) {
         throw error;
      }

      const config: RequestConfigWithRetry = error.config;
      if (config._retried) {
         endAuthSession();
         throw error;
      }

      const accessToken = await getRetryAccessToken(config.headers.Authorization).catch(() => null);
      if (!accessToken) throw error;

      config._retried = true;
      return api(config);
   },
);

export const apiFetch: typeof fetch = async (input, init) => {
   const requestUrl =
      typeof input === 'string' && !input.startsWith('http')
         ? `${API_URL}${input.startsWith('/') ? '' : '/'}${input}`
         : input;

   const headers = new Headers(input instanceof Request ? input.headers : undefined);
   new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
   Object.entries(getDefaultHeaders()).forEach(([name, value]) => {
      if (!headers.has(name)) headers.set(name, value);
   });

   const response = await fetch(requestUrl, { ...init, headers });
   if (response.status !== HttpStatusCode.Unauthorized) return response;

   const accessToken = await getRetryAccessToken(headers.get('Authorization')).catch(() => null);
   if (!accessToken) return response;

   headers.set('Authorization', toBearer(accessToken));
   const retried = await fetch(requestUrl, { ...init, headers });
   if (retried.status === HttpStatusCode.Unauthorized) endAuthSession();
   return retried;
};
