import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { RunnerScoreService } from '../runner-score.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Id of the run to delete, from `listGameScores`.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'deleteRunnerScore',
   description:
      'Permanently delete one saved run of the runner game. **Destructive — irreversible.** ' +
      'To only take a run off the public leaderboard use `setRunnerScoreVisibility` instead. ' +
      'The SDK pauses execution and renders an approval tile to the user — just call the tool ' +
      'with the id; do not chat-ask for confirmation first.',
   inputSchema,
   permission: { resource: PermissionResource.runner_scores, action: PermissionAction.delete },
   behavior: 'destructive',
   audit: { action: 'runnerScore.delete', resourceType: 'runnerScore' },
})
@Injectable()
export class DeleteRunnerScoreTool extends AiToolHandler<Input> {
   constructor(private readonly runnerScoreService: RunnerScoreService) {
      super();
   }

   async execute(_ctx: ToolContext, { id }: Input) {
      try {
         await this.runnerScoreService.remove(id);
         return { id, deleted: true };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Runner score with id ${id} not found.`);
         }
         throw error;
      }
   }
}
