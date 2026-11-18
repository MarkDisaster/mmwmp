import {
   Body,
   Controller,
   Delete,
   Get,
   HttpCode,
   Param,
   ParseIntPipe,
   Patch,
   Query,
   UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuditAction } from '@/audit/decorators/audit-action.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { UpdateRunnerScoreVisibilityDto } from './dto/update-runner-score-visibility.dto';
import { RunnerScoreEntity } from './entity/runner-score.entity';
import { RunnerScoreService } from './runner-score.service';

@ApiTags('Runner scores')
@Controller('runner-scores')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class RunnerScoreController {
   constructor(private runnerScoreService: RunnerScoreService) {}

   @Get()
   @RequirePermission(PermissionResource.runner_scores, PermissionAction.read)
   @ApiOperation({ summary: 'Get all runner game scores, hidden ones included' })
   @ApiPaginatedResponse(RunnerScoreEntity)
   findAll(@Query() query: PaginationQueryDto) {
      return this.runnerScoreService.findAll(query);
   }

   @Patch(':id/visibility')
   @AuditAction('runnerScore.updateVisibility', 'runnerScore')
   @RequirePermission(PermissionResource.runner_scores, PermissionAction.update)
   @ApiOperation({ summary: 'Hide or show a score' })
   @ApiResponse({ status: 200, description: 'Visibility updated', type: RunnerScoreEntity })
   @ApiResponse({ status: 404, description: 'Score not found', type: ErrorResponseDto })
   updateVisibility(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateRunnerScoreVisibilityDto,
   ) {
      return this.runnerScoreService.updateVisibility(id, dto);
   }

   @Delete(':id')
   @AuditAction('runnerScore.delete', 'runnerScore')
   @RequirePermission(PermissionResource.runner_scores, PermissionAction.delete)
   @HttpCode(204)
   @ApiOperation({ summary: 'Delete a score' })
   @ApiResponse({ status: 204, description: 'Score deleted' })
   @ApiResponse({ status: 404, description: 'Score not found', type: ErrorResponseDto })
   remove(@Param('id', ParseIntPipe) id: number) {
      return this.runnerScoreService.remove(id);
   }
}
