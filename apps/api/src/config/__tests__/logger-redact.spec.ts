import pinoHttp from 'pino-http';

import { LOG_REDACT, LOG_SERIALIZERS, redactUrl } from '../logger-redact';

const logLine = (payload: object) => {
   const lines: string[] = [];
   const { logger } = pinoHttp(
      { redact: LOG_REDACT },
      { write: (line: string) => lines.push(line) },
   );
   logger.info(payload);
   return lines.join('');
};

describe('LOG_REDACT', () => {
   it('hides the credentials of a request and a response', () => {
      const line = logLine({
         req: { headers: { authorization: 'Bearer secret-token', cookie: 'sid=secret-cookie' } },
         res: { headers: { 'set-cookie': 'sid=secret-cookie' } },
      });

      expect(line).not.toContain('secret-token');
      expect(line).not.toContain('secret-cookie');
      expect(line).toContain('[Redacted]');
   });

   it('keeps the other headers', () => {
      const line = logLine({ req: { headers: { host: 'api.example.test' } } });

      expect(line).toContain('api.example.test');
   });
});

describe('redactUrl', () => {
   it.each([
      ['/users/invitations/eyJ.secret.token', '/users/invitations/[Redacted]'],
      ['/users/invitations/eyJ.secret.token/accept', '/users/invitations/[Redacted]/accept'],
   ])('hides the invitation token of %s', (url, expected) => {
      expect(redactUrl(url)).toBe(expected);
   });

   it('keeps the other URLs, the invitation endpoint without a token included', () => {
      expect(redactUrl('/users/invitations')).toBe('/users/invitations');
      expect(redactUrl('/projects/3?status=draft')).toBe('/projects/3?status=draft');
   });
});

describe('LOG_SERIALIZERS', () => {
   it('logs a request to an invitation without its token', () => {
      const lines: string[] = [];
      const { logger } = pinoHttp(
         { redact: LOG_REDACT, serializers: LOG_SERIALIZERS },
         { write: (line: string) => lines.push(line) },
      );
      logger.info({
         req: { method: 'HEAD', url: '/users/invitations/eyJ.secret.token', headers: {} },
      });

      const line = lines.join('');
      expect(line).not.toContain('eyJ.secret.token');
      expect(line).toContain('/users/invitations/[Redacted]');
   });
});
