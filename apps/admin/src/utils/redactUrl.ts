export const redactUrl = (url: string): string =>
   url.split(/[?#]/, 1)[0].replace(/(\/(?:invitation|reset-password)\/)[^/]+/g, '$1[token]');
