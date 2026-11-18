import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException, Logger } from '@nestjs/common';
import { captureException } from '@sentry/nestjs';

import { GlobalExceptionFilter } from '../http-exception.filter';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

const buildHost = () => {
   const json = jest.fn();
   const status = jest.fn().mockReturnValue({ json });
   const host = {
      switchToHttp: () => ({
         getResponse: () => ({ status }),
         getRequest: () => ({
            method: 'GET',
            url: '/boom?x=1',
            path: '/boom',
            route: { path: '/boom' },
         }),
      }),
   } as unknown as ArgumentsHost;
   return { host, status, json };
};

describe('GlobalExceptionFilter', () => {
   let errorSpy: jest.SpyInstance;

   beforeEach(() => {
      errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
   });

   afterEach(() => {
      jest.restoreAllMocks();
      jest.mocked(captureException).mockClear();
   });

   it('logs the stack of an unexpected error and answers with a generic 500', () => {
      const { host, status, json } = buildHost();
      const boom = new Error('db exploded');

      new GlobalExceptionFilter().catch(boom, host);

      expect(errorSpy).toHaveBeenCalledWith('GET /boom -> 500', boom.stack);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ statusCode: 500, message: 'Internal server error' });
      expect(captureException).toHaveBeenCalledWith(boom);
   });

   it('does not log client errors raised as HttpException', () => {
      const { host, status } = buildHost();

      new GlobalExceptionFilter().catch(new BadRequestException('nope'), host);

      expect(errorSpy).not.toHaveBeenCalled();
      expect(captureException).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
   });

   it('keeps the status of an http-errors client error such as body-parser 413', () => {
      const { host, status, json } = buildHost();
      const tooLarge = Object.assign(new Error('request entity too large'), {
         status: 413,
         expose: true,
      });

      new GlobalExceptionFilter().catch(tooLarge, host);

      expect(errorSpy).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(413);
      expect(json).toHaveBeenCalledWith({ statusCode: 413, message: 'request entity too large' });
   });

   it('does not expose the message of an error with a status that is not marked as exposed', () => {
      const { host, status, json } = buildHost();
      const hidden = Object.assign(new Error('secret detail'), { status: 400 });

      new GlobalExceptionFilter().catch(hidden, host);

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ statusCode: 500, message: 'Internal server error' });
   });

   it('logs the route pattern and never the token or the query of the URL', () => {
      const json = jest.fn();
      const host = {
         switchToHttp: () => ({
            getResponse: () => ({ status: jest.fn().mockReturnValue({ json }) }),
            getRequest: () => ({
               method: 'POST',
               url: '/users/invitations/secret-token-123/accept?email=a@b.cz',
               path: '/users/invitations/secret-token-123/accept',
               route: { path: '/users/invitations/:token/accept' },
            }),
         }),
      } as unknown as ArgumentsHost;

      new GlobalExceptionFilter().catch(new Error('boom'), host);

      const [message] = errorSpy.mock.calls[0] as [string];
      expect(message).toBe('POST /users/invitations/:token/accept -> 500');
      expect(message).not.toContain('secret-token-123');
   });
});
