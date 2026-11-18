import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminGuard } from '@/common/guards/admin.guard';
import { AuthGuard } from '@/common/guards/auth.guard';

import { AiUsageService } from './ai-usage.service';
import { InteractionListQueryDto } from './dto/interaction-list-query.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';

@ApiTags('AI Observability')
@Controller('ai/observability')
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class AiObservabilityController {
   constructor(private readonly usage: AiUsageService) {}

   @Get('summary')
   @ApiOperation({
      summary: 'Aggregated AI usage over an optional time window (admin-only)',
   })
   @ApiResponse({
      status: 200,
      schema: {
         type: 'object',
         required: ['interactionCount', 'totalTokens', 'avgLatencyMs', 'errorCount'],
         properties: {
            interactionCount: { type: 'integer' },
            totalTokens: { type: 'integer' },
            avgLatencyMs: { type: 'integer', nullable: true },
            errorCount: { type: 'integer' },
         },
      },
   })
   summary(@Query() q: SummaryQueryDto) {
      return this.usage.summary(q);
   }

   @Get('interactions')
   @ApiOperation({ summary: 'Paginated list of AI interactions (admin-only)' })
   @ApiResponse({
      status: 200,
      schema: {
         type: 'object',
         required: ['items', 'page', 'limit', 'total'],
         properties: {
            items: { type: 'array', items: { type: 'object' } },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
         },
      },
   })
   list(@Query() q: InteractionListQueryDto) {
      return this.usage.interactions(q);
   }
}
