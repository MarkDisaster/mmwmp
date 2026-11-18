import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { RevalidationModule } from '@/revalidation/revalidation.module';

import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactPublicController } from './contact-public.controller';
import { GetContactTool } from './tools/get-contact.tool';
import { UpdateContactTool } from './tools/update-contact.tool';

@Module({
   imports: [AuthModule, RevalidationModule, RealtimeModule],
   controllers: [ContactController, ContactPublicController],
   providers: [GetContactTool, UpdateContactTool, ContactService],
   exports: [ContactService],
})
export class ContactModule {}
