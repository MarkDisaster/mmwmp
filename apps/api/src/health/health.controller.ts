import { Controller, Get, Logger } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';

import { PrismaService } from '@/prisma/prisma.service';

@Controller('health')
export class HealthController {
   private readonly logger = new Logger(HealthController.name);

   constructor(
      private health: HealthCheckService,
      private prisma: PrismaService,
   ) {}

   @Get()
   @HealthCheck()
   check() {
      return this.health.check([
         async (): Promise<HealthIndicatorResult> => {
            try {
               await this.prisma.user.count();
               return { database: { status: 'up' } };
            } catch (error) {
               this.logger.error('DB health check failed', error);
               return { database: { status: 'down' } };
            }
         },
      ]);
   }
}
