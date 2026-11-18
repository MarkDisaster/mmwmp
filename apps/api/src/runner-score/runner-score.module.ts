import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RateLimitModule } from '@/rate-limit/rate-limit.module';

import { RunnerScoreController } from './runner-score.controller';
import { RunnerScoreService } from './runner-score.service';
import { RUNNER_SCORE_CLEANUP_QUEUE } from './runner-score-cleanup.constants';
import { RunnerScoreCleanupProcessor } from './runner-score-cleanup.processor';
import { RunnerScoreCleanupQueue } from './runner-score-cleanup.queue';
import { RunnerScoreCleanupService } from './runner-score-cleanup.service';
import { RunnerScorePublicController } from './runner-score-public.controller';
import { DeleteRunnerScoreTool } from './tools/delete-runner-score.tool';
import { FindSuspiciousGameScoresTool } from './tools/find-suspicious-game-scores.tool';
import { GetGameScoreStatsTool } from './tools/get-game-score-stats.tool';
import { ListGameScoresTool } from './tools/list-game-scores.tool';
import { SetRunnerScoreVisibilityTool } from './tools/set-runner-score-visibility.tool';

@Module({
   imports: [
      PrismaModule,
      AuthModule,
      RateLimitModule,
      BullModule.registerQueue({ name: RUNNER_SCORE_CLEANUP_QUEUE }),
      BullBoardModule.forFeature({
         name: RUNNER_SCORE_CLEANUP_QUEUE,
         adapter: BullMQAdapter,
      }),
   ],
   controllers: [RunnerScoreController, RunnerScorePublicController],
   providers: [
      FindSuspiciousGameScoresTool,
      GetGameScoreStatsTool,
      ListGameScoresTool,
      SetRunnerScoreVisibilityTool,
      DeleteRunnerScoreTool,
      RunnerScoreService,
      RunnerScoreCleanupService,
      RunnerScoreCleanupQueue,
      RunnerScoreCleanupProcessor,
   ],
})
export class RunnerScoreModule {}
