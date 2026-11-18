import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { RevalidationModule } from '@/revalidation/revalidation.module';

import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import { TagPublicController } from './tag-public.controller';
import { CreateTagTool } from './tools/create-tag.tool';
import { DeleteTagTool } from './tools/delete-tag.tool';
import { FindTagsTool } from './tools/find-tags.tool';
import { GetTagTool } from './tools/get-tag.tool';
import { ListTagsTool } from './tools/list-tags.tool';
import { MoveTagTool } from './tools/move-tag.tool';
import { RestoreTagTool } from './tools/restore-tag.tool';
import { UpdateTagTool } from './tools/update-tag.tool';

@Module({
   imports: [PrismaModule, AuthModule, RevalidationModule, RealtimeModule],
   controllers: [TagController, TagPublicController],
   providers: [
      ListTagsTool,
      FindTagsTool,
      GetTagTool,
      CreateTagTool,
      UpdateTagTool,
      DeleteTagTool,
      RestoreTagTool,
      MoveTagTool,
      TagService,
   ],
   exports: [TagService],
})
export class TagModule {}
