import { NotFoundException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { FileVariantType } from '@/generated/prisma/enums';

import type { FileService } from '../../file.service';
import { GetFileTool } from '../get-file.tool';

describe('GetFileTool', () => {
   let service: { findOne: jest.Mock };
   let toolInstance: GetFileTool;

   beforeEach(() => {
      service = { findOne: jest.fn() };
      toolInstance = new GetFileTool(service as unknown as FileService);
   });

   const run = (input: { id: number }) => toolInstance.execute(adminContext(), input);

   it('happy path: projects FileService.findOne result into the agent shape', async () => {
      service.findOne.mockResolvedValue({
         id: 1,
         filename: 'uuid',
         originalName: 'cat.png',
         displayName: null,
         mimeType: 'image/png',
         size: 100,
         width: 10,
         height: 10,
         language: null,
         storagePath: 'uploads/uuid',
         publicUrl: 'https://cdn/uploads/uuid/original',
         createdAt: new Date('2026-01-01'),
         createdBy: { id: 5, firstName: 'a', lastName: 'b', email: 'c@d.e' },
         variants: [
            {
               variant: FileVariantType.original,
               mimeType: 'image/png',
               size: 100,
               width: 10,
               height: 10,
               publicUrl: 'https://cdn/uploads/uuid/original',
            },
         ],
      });

      const result = (await run({ id: 1 })) as {
         id: number;
         sizeBytes: number;
         createdBy: unknown;
         variants: Array<{ variant: string }>;
      };

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result.id).toBe(1);
      expect(result.sizeBytes).toBe(100);
      expect(result.variants).toHaveLength(1);
      expect(result.variants[0].variant).toBe(FileVariantType.original);
      expect(result.createdBy).toEqual({ id: 5, firstName: 'a', lastName: 'b' });
   });

   it('translates NotFoundException to an agent-readable Error', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(run({ id: 7 })).rejects.toThrow(/File with id 7 not found/);
   });
});
