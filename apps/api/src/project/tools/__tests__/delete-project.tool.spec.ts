import { NotFoundException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool } from '@/ai/tools/ai-tool.decorator';

import type { ProjectService } from '../../project.service';
import { DeleteProjectTool } from '../delete-project.tool';

describe('DeleteProjectTool', () => {
   let service: { trash: jest.Mock };
   let toolInstance: DeleteProjectTool;

   beforeEach(() => {
      service = { trash: jest.fn() };
      toolInstance = new DeleteProjectTool(service as unknown as ProjectService);
   });

   const run = (input: { id: number }) => toolInstance.execute(adminContext(), input);

   it('is declared destructive so the registry gates it with an approval tile (HITL contract)', () => {
      expect(Reflect.getMetadata(AiTool.KEY, DeleteProjectTool)).toMatchObject({
         behavior: 'destructive',
      });
   });

   it('moves the project to the trash and says it can be restored', async () => {
      service.trash.mockResolvedValue(undefined);

      const result = await run({ id: 1 });

      expect(service.trash).toHaveBeenCalledWith(1, expect.any(Number));
      expect(result).toEqual({ id: 1, trashed: true, restorable: true });
   });

   it('translates NotFoundException to an agent-readable Error', async () => {
      service.trash.mockRejectedValue(new NotFoundException('nope'));

      await expect(run({ id: 99 })).rejects.toThrow(/Project with id 99 not found/);
   });

   it('rethrows non-NotFound errors untouched', async () => {
      const boom = new Error('FK violation');
      service.trash.mockRejectedValue(boom);

      await expect(run({ id: 5 })).rejects.toBe(boom);
   });
});
