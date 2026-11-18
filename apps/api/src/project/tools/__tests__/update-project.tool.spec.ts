import { BadRequestException, NotFoundException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';

import type { ProjectService } from '../../project.service';
import { UpdateProjectTool } from '../update-project.tool';

describe('UpdateProjectTool', () => {
   let service: { update: jest.Mock };
   let toolInstance: UpdateProjectTool;

   beforeEach(() => {
      service = { update: jest.fn() };
      toolInstance = new UpdateProjectTool(service as unknown as ProjectService);
   });

   const run = (input: Parameters<UpdateProjectTool['execute']>[1]) =>
      toolInstance.execute(adminContext(), input);

   it('passes company and the years to ProjectService.update and returns them', async () => {
      service.update.mockResolvedValue({
         id: 4,
         title: 'Demo',
         slug: 'demo',
         sortOrder: 0,
         company: 'ACME',
         startYear: 2024,
         endYear: null,
      });

      const result = await run({ id: 4, company: 'ACME', startYear: 2024, endYear: null });

      expect(service.update).toHaveBeenCalledWith(
         4,
         { slug: undefined, sortOrder: undefined, company: 'ACME', startYear: 2024, endYear: null },
         { userId: 1, canPublish: true },
      );
      expect(result).toEqual(
         expect.objectContaining({ company: 'ACME', startYear: 2024, endYear: null }),
      );
   });

   it('rewrites the year-range BadRequestException into a tool error', async () => {
      service.update.mockRejectedValue(
         new BadRequestException('endYear must not be before startYear'),
      );

      await expect(run({ id: 4, startYear: 2025, endYear: 2024 })).rejects.toThrow(
         'endYear must not be before startYear',
      );
   });

   it('passes ongoing to ProjectService.update and returns it', async () => {
      service.update.mockResolvedValue({
         id: 4,
         title: 'Demo',
         slug: 'demo',
         sortOrder: 0,
         company: null,
         startYear: 2024,
         endYear: null,
         ongoing: true,
      });

      const result = await run({ id: 4, startYear: 2024, endYear: null, ongoing: true });

      expect(service.update).toHaveBeenCalledWith(
         4,
         expect.objectContaining({ startYear: 2024, endYear: null, ongoing: true }),
         { userId: 1, canPublish: true },
      );
      expect(result).toEqual(expect.objectContaining({ ongoing: true }));
   });

   it('rewrites the ongoing rule into a tool error', async () => {
      service.update.mockRejectedValue(
         new BadRequestException(
            'ongoing project must not have endYear (send endYear: null, or ongoing: false)',
         ),
      );

      await expect(run({ id: 4, endYear: 2024 })).rejects.toThrow(
         'ongoing project must not have endYear',
      );
   });

   it('rewrites NotFoundException into a tool error', async () => {
      service.update.mockRejectedValue(new NotFoundException());

      await expect(run({ id: 99 })).rejects.toThrow(/Project with id 99 not found/);
   });
});
