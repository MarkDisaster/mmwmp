import { NotFoundException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool } from '@/ai/tools/ai-tool.decorator';
import { EntityStatus } from '@/generated/prisma/enums';

import type { ProjectService } from '../../project.service';
import { UpdateProjectStatusTool } from '../update-project-status.tool';

describe('UpdateProjectStatusTool', () => {
   let service: { updateStatus: jest.Mock };
   let toolInstance: UpdateProjectStatusTool;

   beforeEach(() => {
      service = { updateStatus: jest.fn() };
      toolInstance = new UpdateProjectStatusTool(service as unknown as ProjectService);
   });

   const run = (input: { id: number; status: EntityStatus }) =>
      toolInstance.execute(adminContext(), input);

   it('is NOT destructive — publish/unpublish is reversible, so no approval tile', () => {
      expect(Reflect.getMetadata(AiTool.KEY, UpdateProjectStatusTool)).toMatchObject({
         behavior: 'mutating',
      });
   });

   it('delegates to ProjectService.updateStatus and returns the projected fields', async () => {
      service.updateStatus.mockResolvedValue({
         id: 4,
         title: 'Demo',
         status: EntityStatus.published,
         publishedAt: new Date('2026-05-01'),
      });

      const result = await run({ id: 4, status: EntityStatus.published });

      expect(service.updateStatus).toHaveBeenCalledWith(4, { status: EntityStatus.published });
      expect(result).toEqual(
         expect.objectContaining({ id: 4, title: 'Demo', status: EntityStatus.published }),
      );
   });

   it('rewrites NotFoundException into a tool error', async () => {
      service.updateStatus.mockRejectedValue(new NotFoundException());

      await expect(run({ id: 99, status: EntityStatus.draft })).rejects.toThrow(
         /Project with id 99 not found/,
      );
   });
});
