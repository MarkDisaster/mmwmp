import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { type AuthorViewer, redactAuthorEmails } from './author';

@Injectable()
export class AuthorPrivacyInterceptor implements NestInterceptor {
   intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      if (context.getType() !== 'http') return next.handle();

      const { user } = context.switchToHttp().getRequest<{ user?: AuthorViewer }>();
      return next.handle().pipe(map((body: unknown) => redactAuthorEmails(body, user)));
   }
}
