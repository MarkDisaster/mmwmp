import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool } from '@/ai/tools/ai-tool.decorator';

import type { ProjectService } from '../../project.service';
import { MoveProjectTool } from '../move-project.tool';

const ADMIN_ACTOR = { userId: 1, canPublish: true };

describe('MoveProjectTool', () => {
   let projectService: { move: jest.Mock };
   let toolInstance: MoveProjectTool;

   beforeEach(() => {
      projectService = { move: jest.fn().mockResolvedValue(undefined) };
      toolInstance = new MoveProjectTool(projectService as unknown as ProjectService);
   });

   it('is NOT destructive — a move is reversible, so no approval tile', () => {
      expect(Reflect.getMetadata(AiTool.KEY, MoveProjectTool)).toMatchObject({
         behavior: 'mutating',
      });
   });

   it('delegates to ProjectService.move with the target and the position', async () => {
      const result = await toolInstance.execute(adminContext(), {
         projectId: 3,
         targetProjectId: 1,
         position: 'before',
      });

      expect(projectService.move).toHaveBeenCalledWith(
         3,
         { targetId: 1, position: 'before' },
         ADMIN_ACTOR,
      );
      expect(result).toEqual({ projectId: 3, targetProjectId: 1, position: 'before', moved: true });
   });

   describe('input schema', () => {
      const schema = Reflect.getMetadata(AiTool.KEY, MoveProjectTool).inputSchema;

      it('accepts before and after', () => {
         expect(
            schema.safeParse({ projectId: 1, targetProjectId: 2, position: 'after' }).success,
         ).toBe(true);
      });

      it('rejects any other position', () => {
         expect(
            schema.safeParse({ projectId: 1, targetProjectId: 2, position: 'first' }).success,
         ).toBe(false);
      });
   });
});
