import { Global, Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';

import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditQueryService } from './audit-query.service';
import { ListAuditLogsTool } from './tools/list-audit-logs.tool';

@Global()
@Module({
   imports: [AuthModule],
   controllers: [AuditController],
   providers: [AuditService, AuditQueryService, ListAuditLogsTool],
   exports: [AuditService, AuditQueryService],
})
export class AuditModule {}
