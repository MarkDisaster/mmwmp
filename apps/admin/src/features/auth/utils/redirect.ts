import type { AuthSessionEndReason } from '@/features/auth/auth-query';

const LOGIN_PATH = '/login';

const BASE_ORIGIN = 'https://admin.invalid';

export const getSafeRedirect = (value: unknown): string | undefined => {
   if (typeof value !== 'string' || !value.startsWith('/')) return undefined;

   let url: URL;
   try {
      url = new URL(value, BASE_ORIGIN);
   } catch {
      return undefined;
   }
   if (url.origin !== BASE_ORIGIN || url.pathname === LOGIN_PATH) return undefined;
   return `${url.pathname}${url.search}${url.hash}`;
};

export const getLoginSearch = (href: string): { redirect?: string } => {
   const redirect = getSafeRedirect(href);
   return redirect === '/' ? {} : { redirect };
};

export const getLoginSearchAfterSessionEnd = (
   href: string,
   reason: AuthSessionEndReason | null,
): { redirect?: string } => (reason === 'logout' ? {} : getLoginSearch(href));
