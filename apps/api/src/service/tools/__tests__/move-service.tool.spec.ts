import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool } from '@/ai/tools/ai-tool.decorator';

import type { ServiceService } from '../../service.service';
import { MoveServiceTool } from '../move-service.tool';

const ADMIN_ACTOR = { userId: 1, canPublish: true };

describe('MoveServiceTool', () => {
   let service: { move: jest.Mock };
   let toolInstance: MoveServiceTool;

   beforeEach(() => {
      service = { move: jest.fn().mockResolvedValue(undefined) };
      toolInstance = new MoveServiceTool(service as unknown as ServiceService);
   });

   it('is NOT destructive — a move is reversible, so no approval tile', () => {
      expect(Reflect.getMetadata(AiTool.KEY, MoveServiceTool)).toMatchObject({
         behavior: 'mutating',
      });
   });

   it('delegates to ServiceService.move with the target and the position', async () => {
      const result = await toolInstance.execute(adminContext(), {
         serviceId: 3,
         targetServiceId: 1,
         position: 'before',
      });

      expect(service.move).toHaveBeenCalledWith(
         3,
         { targetId: 1, position: 'before' },
         ADMIN_ACTOR,
      );
      expect(result).toEqual({ serviceId: 3, targetServiceId: 1, position: 'before', moved: true });
   });

   describe('input schema', () => {
      const schema = Reflect.getMetadata(AiTool.KEY, MoveServiceTool).inputSchema;

      it('accepts before and after', () => {
         expect(
            schema.safeParse({ serviceId: 1, targetServiceId: 2, position: 'before' }).success,
         ).toBe(true);
      });

      it('rejects any other position', () => {
         expect(
            schema.safeParse({ serviceId: 1, targetServiceId: 2, position: 'first' }).success,
         ).toBe(false);
      });
   });
});
