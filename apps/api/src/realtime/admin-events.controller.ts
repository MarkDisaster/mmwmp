import type { MessageEvent } from '@nestjs/common';
import { Controller, HttpException, HttpStatus, Req, Sse, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
   ApiBearerAuth,
   ApiOkResponse,
   ApiOperation,
   ApiProduces,
   ApiResponse,
   ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
   catchError,
   EMPTY,
   exhaustMap,
   filter,
   from,
   ignoreElements,
   interval,
   map,
   merge,
   NEVER,
   type Observable,
   of,
   takeUntil,
   tap,
   timer,
} from 'rxjs';

import { extractBearerToken } from '@/auth/access-token';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { type AuthenticatedUser, AuthGuard, hasPermission } from '@/common/guards/auth.guard';
import { PermissionAction, type PermissionResource } from '@/generated/prisma/enums';

import { ACCESS_RECHECK_INTERVAL_MS, KEEPALIVE_INTERVAL_MS } from './admin-events.constants';
import { AdminEventsService } from './admin-events.service';
import { AdminEventEntity } from './entity/admin-event.entity';
import { StreamLimitGuard } from './stream-limit.guard';

type Role = AuthenticatedUser['role'];

const msUntilExpiry = (jwt: JwtService, token: string): number | null => {
   const payload = jwt.decode<{ exp?: number } | null>(token);
   return typeof payload?.exp === 'number' ? payload.exp * 1000 - Date.now() : null;
};

@ApiTags('Admin events')
@Controller('admin')
@UseGuards(AuthGuard, StreamLimitGuard)
@ApiBearerAuth('JWT-auth')
export class AdminEventsController {
   constructor(
      private readonly events: AdminEventsService,
      private readonly guard: AuthGuard,
      private readonly jwt: JwtService,
   ) {}

   @Sse('events')
   @ApiOperation({
      summary: 'Stream of the changes other admins and AURORA make',
      description:
         'Server-sent events (`text/event-stream`). Call it with `fetch` and the `Authorization` ' +
         'header: `EventSource` cannot send one. `change` carries an `AdminEventEntity` and ' +
         'only reaches a user with the `read` permission of its entity; `resync` means events ' +
         'may have been missed; `ping` keeps an idle proxy from closing the stream. The stream ' +
         'ends when the access token expires, the user is deactivated or the server restarts: ' +
         'connect again with the current token and read the lists again.',
   })
   @ApiProduces('text/event-stream')
   @ApiOkResponse({ description: 'The event stream', type: AdminEventEntity })
   @ApiResponse({
      status: 429,
      description: 'The user has too many open streams',
      type: ErrorResponseDto,
   })
   stream(
      @CurrentUser() user: AuthenticatedUser,
      @Req() request: Request,
   ): Observable<MessageEvent> {
      const access = { role: user.role };
      const token = extractBearerToken(request) ?? '';

      const messages$ = merge(
         this.events.events$.pipe(
            filter(({ entity }) => canRead(access.role, entity)),
            map((event): MessageEvent => ({ type: 'change', data: event })),
         ),
         this.events.resync$.pipe(map((): MessageEvent => ({ type: 'resync', data: {} }))),
         interval(KEEPALIVE_INTERVAL_MS).pipe(
            map((): MessageEvent => ({ type: 'ping', data: {} })),
         ),
      );

      return messages$.pipe(
         takeUntil(merge(this.events.shutdown$, this.watchAccess(token, access))),
      );
   }

   private watchAccess(token: string, access: { role: Role }): Observable<void> {
      const delay = msUntilExpiry(this.jwt, token);
      const expired$ =
         delay === null ? NEVER : timer(Math.max(delay, 0)).pipe(map(() => undefined));

      const revoked$ = interval(ACCESS_RECHECK_INTERVAL_MS).pipe(
         exhaustMap(() =>
            from(this.guard.authenticate(token)).pipe(
               tap((fresh) => (access.role = fresh.role)),
               ignoreElements(),
               catchError((error: unknown) =>
                  error instanceof HttpException && error.getStatus() === HttpStatus.UNAUTHORIZED
                     ? of(undefined)
                     : EMPTY,
               ),
            ),
         ),
      );

      return merge(expired$, revoked$);
   }
}

const canRead = (role: Role, entity: string): boolean =>
   hasPermission(role, { resource: entity as PermissionResource, action: PermissionAction.read });
