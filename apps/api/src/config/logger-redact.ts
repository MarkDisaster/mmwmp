export const LOG_REDACT = {
   paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
   censor: '[Redacted]',
};

const TOKEN_IN_PATH = /(\/users\/invitations\/)(?!$)[^/?#]+/;

export const redactUrl = (url: string): string =>
   url.replace(TOKEN_IN_PATH, `$1${LOG_REDACT.censor}`);

export const LOG_SERIALIZERS = {
   req: (req: { url?: unknown }) =>
      typeof req.url === 'string' ? { ...req, url: redactUrl(req.url) } : req,
};
