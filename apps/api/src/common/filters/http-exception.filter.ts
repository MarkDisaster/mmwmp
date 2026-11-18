import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { captureException } from '@sentry/nestjs';
import type { Request, Response } from 'express';

const getExposedClientError = (exception: unknown): { status: number; message: string } | null => {
   if (!(exception instanceof Error)) return null;
   const { status, expose } = exception as Error & { status?: unknown; expose?: unknown };
   if (typeof status !== 'number' || expose !== true || status < 400 || status >= 500) return null;
   return { status, message: exception.message };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
   private readonly logger = new Logger(GlobalExceptionFilter.name);

   catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const exposed = exception instanceof HttpException ? null : getExposedClientError(exception);

      const status =
         exception instanceof HttpException
            ? exception.getStatus()
            : (exposed?.status ?? HttpStatus.INTERNAL_SERVER_ERROR);

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
         const request = ctx.getRequest<Request>();
         this.logger.error(
            `${request.method ?? ''} ${request.route?.path ?? request.path ?? ''} -> ${status}`.trim(),
            exception instanceof Error ? exception.stack : String(exception),
         );
         captureException(exception);
      }

      const message =
         exception instanceof HttpException
            ? exception.getResponse()
            : exposed
              ? { statusCode: status, message: exposed.message }
              : { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };

      response.status(status).json(
         typeof message === 'string'
            ? {
                 statusCode: status,
                 message,
              }
            : message,
      );
   }
}
