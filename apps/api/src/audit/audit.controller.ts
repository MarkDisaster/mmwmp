import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { AuditQueryService } from './audit-query.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { AuditLogEntity } from './entity/audit-log.entity';

@ApiTags('Audit Logs')
@Controller('audit/logs')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
   constructor(private readonly auditQuery: AuditQueryService) {}

   @Get()
   @RequirePermission(PermissionResource.audit_logs, PermissionAction.read)
   @ApiOperation({ summary: 'List audit log entries (admin only)' })
   @ApiPaginatedResponse(AuditLogEntity)
   findAll(@Query() query: ListAuditLogsDto) {
      return this.auditQuery.list(query);
   }
}
