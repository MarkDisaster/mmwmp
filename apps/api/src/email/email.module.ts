import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { EMAIL_QUEUE } from './email.constants';
import { EmailQueue } from './email.queue';
import { EmailService } from './email.service';

@Module({
   imports: [
      BullModule.registerQueue({ name: EMAIL_QUEUE }),
      BullBoardModule.forFeature({
         name: EMAIL_QUEUE,
         adapter: BullMQAdapter,
      }),
   ],
   providers: [EmailService, EmailQueue],
   exports: [EmailService, EmailQueue],
})
export class EmailModule {}
