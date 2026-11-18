import { Module } from '@nestjs/common';

import { AiModule } from '@/ai/ai.module';
import { AuthModule } from '@/auth/auth.module';
import { PreviewModule } from '@/preview/preview.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RateLimitModule } from '@/rate-limit/rate-limit.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { RevalidationModule } from '@/revalidation/revalidation.module';

import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { ServicePublicController } from './service-public.controller';
import { AddServiceProjectTool } from './tools/add-service-project.tool';
import { AssignServiceProjectsTool } from './tools/assign-service-projects.tool';
import { CreateServiceTool } from './tools/create-service.tool';
import { DeleteServiceTool } from './tools/delete-service.tool';
import { DeleteServiceTranslationTool } from './tools/delete-service-translation.tool';
import { FindServicesTool } from './tools/find-services.tool';
import { GenerateServiceTranslationTool } from './tools/generate-service-translation.tool';
import { GetServiceTool } from './tools/get-service.tool';
import { GetServicePreviewUrlTool } from './tools/get-service-preview-url.tool';
import { ListServicesTool } from './tools/list-services.tool';
import { MoveServiceTool } from './tools/move-service.tool';
import { RemoveServiceProjectTool } from './tools/remove-service-project.tool';
import { RestoreServiceTool } from './tools/restore-service.tool';
import { UpdateServiceTool } from './tools/update-service.tool';
import { UpdateServiceStatusTool } from './tools/update-service-status.tool';
import { UpsertServiceTranslationTool } from './tools/upsert-service-translation.tool';

@Module({
   imports: [
      AiModule,
      PrismaModule,
      AuthModule,
      RevalidationModule,
      RealtimeModule,
      PreviewModule,
      RateLimitModule,
   ],
   controllers: [ServiceController, ServicePublicController],
   providers: [
      CreateServiceTool,
      GenerateServiceTranslationTool,
      GetServicePreviewUrlTool,
      ListServicesTool,
      FindServicesTool,
      GetServiceTool,
      UpdateServiceStatusTool,
      UpdateServiceTool,
      DeleteServiceTool,
      RestoreServiceTool,
      AssignServiceProjectsTool,
      AddServiceProjectTool,
      RemoveServiceProjectTool,
      MoveServiceTool,
      UpsertServiceTranslationTool,
      DeleteServiceTranslationTool,
      ServiceService,
   ],
   exports: [ServiceService],
})
export class ServiceModule {}
