import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { FileModule } from '@/file/file.module';
import { ProjectModule } from '@/project/project.module';
import { ServiceModule } from '@/service/service.module';
import { TagModule } from '@/tag/tag.module';

import { ListTrashTool } from './tools/list-trash.tool';
import { PurgeTrashTool } from './tools/purge-trash.tool';
import { TRASH_PURGE_QUEUE } from './trash-purge.constants';
import { TrashPurgeProcessor } from './trash-purge.processor';
import { TrashPurgeQueue } from './trash-purge.queue';
import { TrashPurgeService } from './trash-purge.service';

@Module({
   imports: [
      ProjectModule,
      ServiceModule,
      TagModule,
      FileModule,
      BullModule.registerQueue({ name: TRASH_PURGE_QUEUE }),
      BullBoardModule.forFeature({ name: TRASH_PURGE_QUEUE, adapter: BullMQAdapter }),
   ],
   providers: [
      TrashPurgeService,
      TrashPurgeQueue,
      TrashPurgeProcessor,
      ListTrashTool,
      PurgeTrashTool,
   ],
   exports: [TrashPurgeService],
})
export class TrashModule {}
