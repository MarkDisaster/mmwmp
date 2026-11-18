import { NotFoundException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { RunnerScoreService } from '../../runner-score.service';
import { DeleteRunnerScoreTool } from '../delete-runner-score.tool';
import { SetRunnerScoreVisibilityTool } from '../set-runner-score-visibility.tool';

const meta = (Class: object) => Reflect.getMetadata(AiTool.KEY, Class) as AiToolMetadata;

describe('SetRunnerScoreVisibilityTool', () => {
   let service: { updateVisibility: jest.Mock };
   let tool: SetRunnerScoreVisibilityTool;

   beforeEach(() => {
      service = { updateVisibility: jest.fn() };
      tool = new SetRunnerScoreVisibilityTool(service as unknown as RunnerScoreService);
   });

   it('needs runner_scores.update, as PATCH /runner-scores/:id/visibility does', () => {
      expect(meta(SetRunnerScoreVisibilityTool)).toMatchObject({
         permission: {
            resource: PermissionResource.runner_scores,
            action: PermissionAction.update,
         },
         behavior: 'mutating',
         needsApproval: true,
         audit: { action: 'runnerScore.updateVisibility' },
      });
   });

   it('hides a run and answers with its new state', async () => {
      service.updateVisibility.mockResolvedValue({
         id: 4,
         nick: 'AAA',
         score: 9,
         seconds: 3,
         hidden: true,
         createdAt: new Date(),
      });

      const result = await tool.execute(adminContext(), { id: 4, hidden: true });

      expect(service.updateVisibility).toHaveBeenCalledWith(4, { hidden: true });
      expect(result).toEqual({ id: 4, nick: 'AAA', score: 9, hidden: true });
   });

   it('answers a missing run with a readable error', async () => {
      service.updateVisibility.mockRejectedValue(new NotFoundException('Score not found'));

      await expect(tool.execute(adminContext(), { id: 9, hidden: false })).rejects.toThrow(
         'Runner score with id 9 not found.',
      );
   });
});

describe('DeleteRunnerScoreTool', () => {
   let service: { remove: jest.Mock };
   let tool: DeleteRunnerScoreTool;

   beforeEach(() => {
      service = { remove: jest.fn().mockResolvedValue(undefined) };
      tool = new DeleteRunnerScoreTool(service as unknown as RunnerScoreService);
   });

   it('is destructive and needs runner_scores.delete (approval tile)', () => {
      expect(meta(DeleteRunnerScoreTool)).toMatchObject({
         permission: {
            resource: PermissionResource.runner_scores,
            action: PermissionAction.delete,
         },
         behavior: 'destructive',
         audit: { action: 'runnerScore.delete' },
      });
   });

   it('deletes one run', async () => {
      expect(await tool.execute(adminContext(), { id: 4 })).toEqual({ id: 4, deleted: true });
      expect(service.remove).toHaveBeenCalledWith(4);
   });

   it('answers a missing run with a readable error', async () => {
      service.remove.mockRejectedValue(new NotFoundException());

      await expect(tool.execute(adminContext(), { id: 9 })).rejects.toThrow(
         'Runner score with id 9 not found.',
      );
   });
});
