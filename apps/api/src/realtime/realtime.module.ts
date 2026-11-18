import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { AuthGuard } from '@/common/guards/auth.guard';

import { AdminEventsController } from './admin-events.controller';
import { AdminEventsService } from './admin-events.service';
import { StreamLimitGuard } from './stream-limit.guard';

@Module({
   imports: [AuthModule],
   controllers: [AdminEventsController],
   providers: [AdminEventsService, AuthGuard, StreamLimitGuard],
   exports: [AdminEventsService],
})
export class RealtimeModule {}
