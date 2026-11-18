import { Module } from '@nestjs/common';

import { AiModule } from '@/ai/ai.module';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RateLimitModule } from '@/rate-limit/rate-limit.module';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRateLimitService } from './chat-rate-limit.service';
import { ConversationService } from './conversation.service';
import { PageContextService } from './page-context.service';

@Module({
   imports: [PrismaModule, AuthModule, AiModule, RateLimitModule],
   controllers: [ChatController],
   providers: [ChatService, ConversationService, ChatRateLimitService, PageContextService],
})
export class ChatModule {}
