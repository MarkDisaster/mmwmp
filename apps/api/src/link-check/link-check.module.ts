import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';

import { LinkCheckService } from './link-check.service';
import { CheckLinksTool } from './tools/check-links.tool';

@Module({
   imports: [PrismaModule],
   providers: [LinkCheckService, CheckLinksTool],
})
export class LinkCheckModule {}
