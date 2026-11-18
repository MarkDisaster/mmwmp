import type { NestMiddleware } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';

import { extractBearerToken, verifyAccessToken } from '@/auth/access-token';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class BullBoardAuthMiddleware implements NestMiddleware {
   constructor(
      private readonly jwtService: JwtService,
      private readonly config: ConfigService,
      private readonly prisma: PrismaService,
   ) {}

   async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
      const user = await verifyAccessToken(extractBearerToken(req), {
         jwtService: this.jwtService,
         prisma: this.prisma,
         secret: this.config.getOrThrow<string>('auth.jwtSecret'),
      });
      if (!user.role.isAdmin) {
         throw new ForbiddenException();
      }
      next();
   }
}
