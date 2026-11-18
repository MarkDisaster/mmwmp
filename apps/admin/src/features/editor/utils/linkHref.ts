const SITE_HOSTS = ['marek.media', 'www.marek.media'];

const ALLOWED_LINK_SCHEMES = ['http', 'https', 'mailto', 'tel'];

export const isSanitizerAllowedUri = (url: string) => {
   const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url.trim())?.[1];
   return !scheme || ALLOWED_LINK_SCHEMES.includes(scheme.toLowerCase());
};

export const isRelativeHref = (href: string) => /^(\/(?![/\\])|#|\.{1,2}\/|\?)/.test(href);

export const isInternalHref = (href: string) => {
   if (isRelativeHref(href)) return true;
   try {
      return SITE_HOSTS.includes(new URL(href).hostname);
   } catch {
      return false;
   }
};

export const normalizeHref = (raw: string) => {
   const href = raw.trim();
   if (!href || isRelativeHref(href) || /^[/\\]{2}/.test(href)) return href;
   if (/^(mailto|tel):/i.test(href)) return href;
   if (/^[a-z][a-z0-9+.-]*:(?!\d+([/?#]|$))/i.test(href)) return href;
   if (/^[^\s@/]+@[^\s@/]+$/.test(href)) return `mailto:${href}`;
   return `https://${href}`;
};

export const isParsableHref = (href: string) => {
   if (!/^https?:\/\//i.test(href)) return true;
   try {
      new URL(href);
      return true;
   } catch {
      return false;
   }
};
