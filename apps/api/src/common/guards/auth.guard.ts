import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { extractBearerToken, verifyAccessToken } from '@/auth/access-token';
import type { RequiredPermission } from '@/common/decorators/require-permission.decorator';
import { PERMISSION_KEY } from '@/common/decorators/require-permission.decorator';
import type { Role, RolePermission, User } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type AuthenticatedUser = User & { role: Role & { permissions: RolePermission[] } };
type RequestWithUser = Request & { user: AuthenticatedUser };

export const hasPermission = (
   role: {
      isAdmin: boolean;
      permissions: ReadonlyArray<{ resource: string; action: string }>;
   },
   { resource, action }: RequiredPermission,
): boolean =>
   role.isAdmin || role.permissions.some((p) => p.resource === resource && p.action === action);

@Injectable()
export class AuthGuard implements CanActivate {
   constructor(
      private jwtService: JwtService,
      private config: ConfigService,
      private prisma: PrismaService,
      private reflector: Reflector,
   ) {}

   async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const user = await this.authenticate(extractBearerToken(request));

      const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
         PERMISSION_KEY,
         [context.getHandler(), context.getClass()],
      );
      if (required && !hasPermission(user.role, required)) {
         throw new ForbiddenException('Insufficient permissions');
      }

      request.user = user;
      return true;
   }

   authenticate(token: string | undefined): Promise<AuthenticatedUser> {
      return verifyAccessToken(token, {
         jwtService: this.jwtService,
         prisma: this.prisma,
         secret: this.config.getOrThrow<string>('auth.jwtSecret'),
      });
   }
}
