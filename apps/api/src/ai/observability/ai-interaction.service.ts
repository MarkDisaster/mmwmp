import { Injectable, Logger } from '@nestjs/common';

import type { ProviderId } from '@/ai/models';
import { PrismaService } from '@/prisma/prisma.service';

export type RecordInteractionInput = {
   conversationId: string;
   userId: number | null;
   provider: ProviderId;
   model: string;
   inputTokens: number;
   outputTokens: number;
   totalTokens: number;
   cacheReadTokens?: number | null;
   cacheWriteTokens?: number | null;
   latencyMs: number;
   toolCallCount: number;
   stepCount: number;
   finishReason?: string | null;
   error?: string | null;
};

@Injectable()
export class AiInteractionService {
   private readonly logger = new Logger(AiInteractionService.name);

   constructor(private readonly prisma: PrismaService) {}

   async record(data: RecordInteractionInput): Promise<void> {
      try {
         await this.prisma.aiInteraction.create({
            data: {
               conversationId: data.conversationId,
               userId: data.userId,
               provider: data.provider,
               model: data.model,
               inputTokens: data.inputTokens,
               outputTokens: data.outputTokens,
               totalTokens: data.totalTokens,
               cacheReadTokens: data.cacheReadTokens ?? null,
               cacheWriteTokens: data.cacheWriteTokens ?? null,
               latencyMs: data.latencyMs,
               toolCallCount: data.toolCallCount,
               stepCount: data.stepCount,
               finishReason: data.finishReason ?? null,
               error: data.error ?? null,
            },
         });
      } catch (err) {
         this.logger.error(
            `Failed to record AI interaction (conversation=${data.conversationId}): ${
               err instanceof Error ? err.message : String(err)
            }`,
         );
      }
   }
}
