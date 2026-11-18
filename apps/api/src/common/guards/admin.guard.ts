import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import type { Role, User } from '@/generated/prisma/client';

type RequestWithUser = Request & { user?: User & { role?: Role } };

@Injectable()
export class AdminGuard implements CanActivate {
   canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      if (!request.user?.role?.isAdmin) {
         throw new ForbiddenException('Admin role required');
      }
      return true;
   }
}
