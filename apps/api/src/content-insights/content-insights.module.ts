import { Module } from '@nestjs/common';

import { AuditModule } from '@/audit/audit.module';
import { FileModule } from '@/file/file.module';
import { PrismaModule } from '@/prisma/prisma.module';

import { ContentAuditService } from './content-audit.service';
import { ContentStatsService } from './content-stats.service';
import { AuditContentTool } from './tools/audit-content.tool';
import { GetContentStatsTool } from './tools/get-content-stats.tool';

@Module({
   imports: [PrismaModule, FileModule, AuditModule],
   providers: [ContentAuditService, ContentStatsService, AuditContentTool, GetContentStatsTool],
})
export class ContentInsightsModule {}
