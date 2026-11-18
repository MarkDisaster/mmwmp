import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { RevalidationModule } from '@/revalidation/revalidation.module';
import { StorageModule } from '@/storage/storage.module';

import { FileController } from './file.controller';
import { FileService } from './file.service';
import { FileImagePreviewService } from './file-image-preview.service';
import { FILE_THUMBNAIL_QUEUE } from './file-thumbnail.constants';
import { FileThumbnailProcessor } from './file-thumbnail.processor';
import { FileThumbnailQueue } from './file-thumbnail.queue';
import { DeleteFileTool } from './tools/delete-file.tool';
import { DeleteFilesTool } from './tools/delete-files.tool';
import { FindUnusedFilesTool } from './tools/find-unused-files.tool';
import { GetFileTool } from './tools/get-file.tool';
import { ListFilesTool } from './tools/list-files.tool';
import { RestoreFileTool } from './tools/restore-file.tool';
import { UpdateFileTool } from './tools/update-file.tool';
import { UpdateFilesTool } from './tools/update-files.tool';
import { ViewFileImageTool } from './tools/view-file-image.tool';

@Module({
   imports: [
      PrismaModule,
      StorageModule,
      RevalidationModule,
      RealtimeModule,
      AuthModule,
      BullModule.registerQueue({ name: FILE_THUMBNAIL_QUEUE }),
      BullBoardModule.forFeature({
         name: FILE_THUMBNAIL_QUEUE,
         adapter: BullMQAdapter,
      }),
   ],
   controllers: [FileController],
   providers: [
      DeleteFilesTool,
      FindUnusedFilesTool,
      ListFilesTool,
      GetFileTool,
      UpdateFileTool,
      UpdateFilesTool,
      ViewFileImageTool,
      FileImagePreviewService,
      DeleteFileTool,
      RestoreFileTool,
      FileService,
      FileThumbnailQueue,
      FileThumbnailProcessor,
   ],
   exports: [FileService],
})
export class FileModule {}
