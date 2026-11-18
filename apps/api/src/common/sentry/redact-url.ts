export const redactUrl = (url: string): string =>
   url.split(/[?#]/, 1)[0].replace(/(\/invitations\/)[^/]+/g, '$1[token]');
