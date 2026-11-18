import { Module } from '@nestjs/common';

import { AiModule } from '@/ai/ai.module';
import { AuthModule } from '@/auth/auth.module';
import { FileModule } from '@/file/file.module';
import { PreviewModule } from '@/preview/preview.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RateLimitModule } from '@/rate-limit/rate-limit.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { RevalidationModule } from '@/revalidation/revalidation.module';
import { StorageModule } from '@/storage/storage.module';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectPublicController } from './project-public.controller';
import { AddProjectMediaTool } from './tools/add-project-media.tool';
import { AddProjectTagTool } from './tools/add-project-tag.tool';
import { AddTagToProjectsTool } from './tools/add-tag-to-projects.tool';
import { AssignProjectTagsTool } from './tools/assign-project-tags.tool';
import { CreateProjectTool } from './tools/create-project.tool';
import { DeleteProjectTool } from './tools/delete-project.tool';
import { DeleteProjectTranslationTool } from './tools/delete-project-translation.tool';
import { FindProjectsTool } from './tools/find-projects.tool';
import { GenerateProjectTranslationTool } from './tools/generate-project-translation.tool';
import { GetProjectTool } from './tools/get-project.tool';
import { GetProjectPreviewUrlTool } from './tools/get-project-preview-url.tool';
import { ListProjectsTool } from './tools/list-projects.tool';
import { MoveProjectTool } from './tools/move-project.tool';
import { RemoveProjectMediaTool } from './tools/remove-project-media.tool';
import { RemoveProjectTagTool } from './tools/remove-project-tag.tool';
import { RemoveTagFromProjectsTool } from './tools/remove-tag-from-projects.tool';
import { RestoreProjectTool } from './tools/restore-project.tool';
import { SetProjectLinksTool } from './tools/set-project-links.tool';
import { SetProjectThumbnailTool } from './tools/set-project-thumbnail.tool';
import { SortProjectMediaTool } from './tools/sort-project-media.tool';
import { SortProjectTagsTool } from './tools/sort-project-tags.tool';
import { UpdateProjectTool } from './tools/update-project.tool';
import { UpdateProjectStatusTool } from './tools/update-project-status.tool';
import { UpdateProjectsStatusTool } from './tools/update-projects-status.tool';
import { UpsertProjectTranslationTool } from './tools/upsert-project-translation.tool';

@Module({
   imports: [
      AiModule,
      PrismaModule,
      AuthModule,
      FileModule,
      StorageModule,
      RevalidationModule,
      RealtimeModule,
      PreviewModule,
      RateLimitModule,
   ],
   controllers: [ProjectController, ProjectPublicController],
   providers: [
      AddTagToProjectsTool,
      RemoveTagFromProjectsTool,
      UpdateProjectsStatusTool,
      CreateProjectTool,
      GenerateProjectTranslationTool,
      GetProjectPreviewUrlTool,
      SortProjectTagsTool,
      ListProjectsTool,
      FindProjectsTool,
      GetProjectTool,
      UpdateProjectStatusTool,
      UpdateProjectTool,
      DeleteProjectTool,
      RestoreProjectTool,
      AssignProjectTagsTool,
      AddProjectTagTool,
      RemoveProjectTagTool,
      AddProjectMediaTool,
      RemoveProjectMediaTool,
      SortProjectMediaTool,
      SetProjectLinksTool,
      SetProjectThumbnailTool,
      UpsertProjectTranslationTool,
      DeleteProjectTranslationTool,
      ProjectService,
      MoveProjectTool,
   ],
   exports: [ProjectService],
})
export class ProjectModule {}
