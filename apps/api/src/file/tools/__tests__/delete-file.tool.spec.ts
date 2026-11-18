import { NotFoundException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool } from '@/ai/tools/ai-tool.decorator';

import type { FileService } from '../../file.service';
import { DeleteFileTool } from '../delete-file.tool';

describe('DeleteFileTool', () => {
   let service: { trash: jest.Mock };
   let toolInstance: DeleteFileTool;

   beforeEach(() => {
      service = { trash: jest.fn() };
      toolInstance = new DeleteFileTool(service as unknown as FileService);
   });

   const run = (input: { id: number }) => toolInstance.execute(adminContext(), input);

   it('is declared destructive so the registry gates it with an approval tile (HITL contract)', () => {
      expect(Reflect.getMetadata(AiTool.KEY, DeleteFileTool)).toMatchObject({
         behavior: 'destructive',
      });
   });

   it('moves the file to the trash with the publish gate of the caller', async () => {
      service.trash.mockResolvedValue(undefined);

      const result = await run({ id: 12 });

      expect(service.trash).toHaveBeenCalledWith(12, expect.any(Number), expect.any(Boolean));
      expect(result).toEqual({ id: 12, trashed: true, restorable: true });
   });

   it('translates NotFoundException to an agent error', async () => {
      service.trash.mockRejectedValue(new NotFoundException());

      await expect(run({ id: 12 })).rejects.toThrow(/File with id 12 not found/);
   });

   it('rethrows unexpected errors untouched', async () => {
      service.trash.mockRejectedValue(new Error('boom'));

      await expect(run({ id: 12 })).rejects.toThrow('boom');
   });
});
