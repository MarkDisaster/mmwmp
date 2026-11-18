import { ConflictException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';

import type { TagService } from '../../tag.service';
import { CreateTagTool } from '../create-tag.tool';

describe('CreateTagTool', () => {
   let service: { create: jest.Mock };
   let toolInstance: CreateTagTool;

   beforeEach(() => {
      service = { create: jest.fn() };
      toolInstance = new CreateTagTool(service as unknown as TagService);
   });

   const translations = [
      { language: 'cs' as const, name: 'Případová studie' },
      { language: 'en' as const, name: 'Case study' },
   ];
   const run = (input: {
      slug: string;
      translations: { language: 'cs' | 'en'; name: string }[];
      color?: string;
   }) => toolInstance.execute(adminContext(), input);

   it('delegates to TagService.create and returns the new tag projection', async () => {
      service.create.mockResolvedValue({
         id: 10,
         translations,
         slug: 'pripadova-studie',
         color: '#06f',
      });

      const result = await run({ slug: 'pripadova-studie', translations, color: '#06f' });

      expect(service.create).toHaveBeenCalledWith({
         slug: 'pripadova-studie',
         translations,
         color: '#06f',
      });
      expect(result).toEqual({
         id: 10,
         name: 'Případová studie',
         names: { cs: 'Případová studie', en: 'Case study' },
         slug: 'pripadova-studie',
         color: '#06f',
      });
   });

   it('rewraps ConflictException into a tool-readable Error with the original message', async () => {
      service.create.mockRejectedValue(new ConflictException('Slug already exists'));

      await expect(run({ slug: 'react', translations })).rejects.toThrow(/Slug already exists/);
   });
});
