import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { AuthenticatedUser } from '@/common/guards/auth.guard';

import { MAX_STREAMS_PER_USER } from './admin-events.constants';
import { AdminEventsService } from './admin-events.service';

@Injectable()
export class StreamLimitGuard implements CanActivate {
   private readonly streamsPerUser = new Map<number, number>();

   constructor(private readonly events: AdminEventsService) {}

   canActivate(context: ExecutionContext): boolean {
      if (this.events.isClosing) throw new ServiceUnavailableException('The server is restarting');
      const http = context.switchToHttp();
      const { user } = http.getRequest<Request & { user: AuthenticatedUser }>();
      const count = this.streamsPerUser.get(user.id) ?? 0;
      if (count >= MAX_STREAMS_PER_USER) {
         throw new HttpException('Too many open event streams', HttpStatus.TOO_MANY_REQUESTS);
      }
      this.streamsPerUser.set(user.id, count + 1);

      http.getResponse<Response>().once('close', () => {
         const open = (this.streamsPerUser.get(user.id) ?? 1) - 1;
         if (open > 0) this.streamsPerUser.set(user.id, open);
         else this.streamsPerUser.delete(user.id);
      });
      return true;
   }
}
