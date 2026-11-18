import { NotFoundException } from '@nestjs/common';

import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import type { TagService } from '../../tag.service';
import { CreateTagTool } from '../create-tag.tool';
import { DeleteTagTool } from '../delete-tag.tool';
import { FindTagsTool } from '../find-tags.tool';
import { GetTagTool } from '../get-tag.tool';
import { ListTagsTool } from '../list-tags.tool';
import { MoveTagTool } from '../move-tag.tool';
import { RestoreTagTool } from '../restore-tag.tool';
import { UpdateTagTool } from '../update-tag.tool';

const translations = [
   { language: 'cs' as const, name: 'Případová studie' },
   { language: 'en' as const, name: 'Case study' },
];
const stored = { id: 7, slug: 'pripadova-studie', color: null, translations };

describe('UpdateTagTool', () => {
   let service: { findOne: jest.Mock; update: jest.Mock };
   let tool: UpdateTagTool;

   beforeEach(() => {
      service = { findOne: jest.fn(), update: jest.fn().mockResolvedValue(stored) };
      tool = new UpdateTagTool(service as unknown as TagService);
   });

   it('hands the names to the service to merge and never reads them itself', async () => {
      const result = await tool.execute(adminContext(), {
         id: 7,
         currentName: 'Případová studie',
         translations: [translations[1]],
         removeLanguages: ['en'],
         slug: 'case-study',
         color: '#fff',
      });

      expect(service.findOne).not.toHaveBeenCalled();
      expect(service.update).toHaveBeenCalledWith(
         7,
         { translations: [translations[1]], slug: 'case-study', color: '#fff' },
         { removeLanguages: ['en'], expectedName: 'Případová studie' },
      );
      expect(result).toMatchObject({ names: { cs: 'Případová studie', en: 'Case study' } });
   });

   it('passes an empty removal list when none is given', async () => {
      await tool.execute(adminContext(), { id: 7, currentName: 'A', slug: 'x' });

      expect(service.update).toHaveBeenCalledWith(
         7,
         { translations: undefined, slug: 'x', color: undefined },
         { removeLanguages: [], expectedName: 'A' },
      );
   });

   it('answers a missing tag in words', async () => {
      service.update.mockRejectedValue(new NotFoundException());

      await expect(
         tool.execute(adminContext(), { id: 9, currentName: 'A', removeLanguages: ['en'] }),
      ).rejects.toThrow('Tag with id 9 not found.');
   });
});

describe('read tools', () => {
   it('getTag returns both names', async () => {
      const service = { findOne: jest.fn().mockResolvedValue({ ...stored, sortOrder: 1 }) };
      const result = await new GetTagTool(service as unknown as TagService).execute(
         adminContext(),
         { id: 7 },
      );

      expect(result).toMatchObject({
         name: 'Případová studie',
         names: { cs: 'Případová studie', en: 'Case study' },
      });
   });

   it('findTags finds a tag by its English name', async () => {
      const service = { findLookupCandidates: jest.fn().mockResolvedValue([stored]) };
      const result = await new FindTagsTool(service as unknown as TagService).execute(
         adminContext(),
         { query: 'case study' },
      );

      expect(result.items).toEqual([
         expect.objectContaining({
            id: 7,
            matchedOn: 'name (en)',
            names: { cs: 'Případová studie', en: 'Case study' },
         }),
      ]);
   });

   it('findTags finds a tag by its Czech name without diacritics', async () => {
      const service = { findLookupCandidates: jest.fn().mockResolvedValue([stored]) };
      const result = await new FindTagsTool(service as unknown as TagService).execute(
         adminContext(),
         { query: 'pripadova studie' },
      );

      expect(result.items[0]).toMatchObject({ id: 7, match: 'exact' });
   });
});

describe('restoreTag', () => {
   it('returns the restored tag with its names', async () => {
      const service = { restore: jest.fn().mockResolvedValue(stored) };
      const result = await new RestoreTagTool(service as unknown as TagService).execute(
         adminContext(),
         { id: 7 },
      );

      expect(result).toMatchObject({ id: 7, restored: true, names: { en: 'Case study' } });
   });
});

describe('permissions of the tag tools', () => {
   it.each([
      [ListTagsTool, PermissionAction.read],
      [FindTagsTool, PermissionAction.read],
      [GetTagTool, PermissionAction.read],
      [CreateTagTool, PermissionAction.create],
      [UpdateTagTool, PermissionAction.update],
      [MoveTagTool, PermissionAction.update],
      [DeleteTagTool, PermissionAction.delete],
      [RestoreTagTool, PermissionAction.delete],
   ])('%p needs the expected tags grant', (ToolClass, action) => {
      const meta = Reflect.getMetadata(AiTool.KEY, ToolClass) as AiToolMetadata;

      expect(meta.permission).toEqual({ resource: PermissionResource.tags, action });
   });
});
