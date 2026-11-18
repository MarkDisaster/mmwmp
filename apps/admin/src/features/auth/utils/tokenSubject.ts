const toBase64 = (base64Url: string) => base64Url.replace(/-/gu, '+').replace(/_/gu, '/');

export const getTokenSubject = (token: string): string | null => {
   const payload = token.split('.')[1];
   if (!payload) return null;
   try {
      const claims = JSON.parse(atob(toBase64(payload))) as { sub?: unknown } | null;
      const subject = claims?.sub;
      return typeof subject === 'string' || typeof subject === 'number' ? String(subject) : null;
   } catch {
      return null;
   }
};
