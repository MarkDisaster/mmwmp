import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AuthGuard } from '@/common/guards/auth.guard';

import { AiInteractionService } from './ai-interaction.service';
import { AiObservabilityController } from './ai-observability.controller';
import { AiUsageService } from './ai-usage.service';
import { GetAiUsageStatsTool } from './tools/get-ai-usage-stats.tool';

@Module({
   imports: [AuthModule],
   controllers: [AiObservabilityController],
   providers: [AiInteractionService, AiUsageService, GetAiUsageStatsTool, AuthGuard, AdminGuard],
   exports: [AiInteractionService],
})
export class AiObservabilityModule {}
