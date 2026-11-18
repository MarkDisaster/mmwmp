import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';

import { RevalidationController } from './revalidation.controller';
import { RevalidationService } from './revalidation.service';
import { RevalidateWebsiteTool } from './tools/revalidate-website.tool';

@Module({
   imports: [AuthModule],
   controllers: [RevalidationController],
   providers: [RevalidationService, RevalidateWebsiteTool],
   exports: [RevalidationService],
})
export class RevalidationModule {}
