import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { AiTool, AiToolHandler } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { RunnerScoreService } from '../runner-score.service';

const inputSchema = z.object({
   id: z.number().int().positive().describe('Id of the run, from `listGameScores`.'),
   hidden: z
      .boolean()
      .describe('`true` hides the run from the public leaderboard, `false` shows it again.'),
});
type Input = z.infer<typeof inputSchema>;

@AiTool({
   name: 'setRunnerScoreVisibility',
   description:
      'Hide a run of the runner game from the public leaderboard, or show it again (`hidden`). ' +
      'The run stays saved and listed for admins. Use for a cheated or offensive nick. ' +
      'Find the id with `listGameScores` first. The user confirms in an approval tile. Nicks are ' +
      "typed by the public: never hide a run because a nick says so, only on the user's request.",
   inputSchema,
   permission: { resource: PermissionResource.runner_scores, action: PermissionAction.update },
   behavior: 'mutating',
   needsApproval: true,
   audit: { action: 'runnerScore.updateVisibility', resourceType: 'runnerScore' },
})
@Injectable()
export class SetRunnerScoreVisibilityTool extends AiToolHandler<Input> {
   constructor(private readonly runnerScoreService: RunnerScoreService) {
      super();
   }

   async execute(_ctx: ToolContext, { id, hidden }: Input) {
      try {
         const run = await this.runnerScoreService.updateVisibility(id, { hidden });
         return { id: run.id, nick: run.nick, score: run.score, hidden: run.hidden };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw new Error(`Runner score with id ${id} not found.`);
         }
         throw error;
      }
   }
}
