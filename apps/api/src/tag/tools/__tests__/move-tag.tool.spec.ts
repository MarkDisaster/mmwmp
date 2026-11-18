import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool } from '@/ai/tools/ai-tool.decorator';

import type { TagService } from '../../tag.service';
import { MoveTagTool } from '../move-tag.tool';

describe('MoveTagTool', () => {
   let service: { move: jest.Mock };
   let toolInstance: MoveTagTool;

   beforeEach(() => {
      service = { move: jest.fn().mockResolvedValue(undefined) };
      toolInstance = new MoveTagTool(service as unknown as TagService);
   });

   it('is NOT destructive — a move is reversible, so no approval tile', () => {
      expect(Reflect.getMetadata(AiTool.KEY, MoveTagTool)).toMatchObject({
         behavior: 'mutating',
      });
   });

   it('delegates to TagService.move with the target and the position', async () => {
      const result = await toolInstance.execute(adminContext(), {
         tagId: 3,
         targetTagId: 1,
         position: 'before',
      });

      expect(service.move).toHaveBeenCalledWith(3, { targetId: 1, position: 'before' });
      expect(result).toEqual({ tagId: 3, targetTagId: 1, position: 'before', moved: true });
   });

   describe('input schema', () => {
      const schema = Reflect.getMetadata(AiTool.KEY, MoveTagTool).inputSchema;

      it('accepts before and after', () => {
         expect(schema.safeParse({ tagId: 1, targetTagId: 2, position: 'before' }).success).toBe(
            true,
         );
      });

      it('rejects any other position', () => {
         expect(schema.safeParse({ tagId: 1, targetTagId: 2, position: 'first' }).success).toBe(
            false,
         );
      });
   });
});
