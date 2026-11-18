import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { adminContext, contextWithGrants } from '@/ai/tools/__tests__/tool-context.fixture';
import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';
import { EntityStatus, PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import type { PreviewService } from '@/preview/preview.service';

import type { ProjectService } from '../../project.service';
import { CreateProjectTool } from '../create-project.tool';
import { GenerateProjectTranslationTool } from '../generate-project-translation.tool';
import { GetProjectPreviewUrlTool } from '../get-project-preview-url.tool';
import { SortProjectTagsTool } from '../sort-project-tags.tool';
import { UpdateProjectTool } from '../update-project.tool';

const meta = (Class: object) => Reflect.getMetadata(AiTool.KEY, Class) as AiToolMetadata;
const projectsGrant = (action: PermissionAction) => ({
   resource: PermissionResource.projects,
   action,
});

describe('CreateProjectTool', () => {
   let service: { saveNew: jest.Mock };
   let tool: CreateProjectTool;

   beforeEach(() => {
      service = {
         saveNew: jest
            .fn()
            .mockResolvedValue({ id: 12, slug: 'nemocnice', title: 'Nemocnice', status: 'draft' }),
      };
      tool = new CreateProjectTool(service as unknown as ProjectService);
   });

   it('needs projects.create and asks for approval only when it publishes', () => {
      const { permission, needsApproval } = meta(CreateProjectTool);

      expect(permission).toEqual(projectsGrant(PermissionAction.create));
      expect(typeof needsApproval === 'function' && needsApproval({ status: undefined })).toBe(
         false,
      );
      expect(
         typeof needsApproval === 'function' && needsApproval({ status: EntityStatus.published }),
      ).toBe(true);
   });

   it('saves a draft with the Czech version through the REST aggregate save', async () => {
      const result = await tool.execute(adminContext(), {
         slug: 'nemocnice',
         cs: { title: 'Nemocnice' },
      });

      expect(service.saveNew).toHaveBeenCalledWith(
         expect.objectContaining({
            slug: 'nemocnice',
            showOnHomepage: false,
            translations: [{ language: 'cs', title: 'Nemocnice' }],
            tagIds: [],
            links: [],
            media: [],
            status: undefined,
         }),
         { userId: 1, canPublish: true },
      );
      expect(result).toEqual({
         id: 12,
         slug: 'nemocnice',
         title: 'Nemocnice',
         status: 'draft',
         adminUrl: '/projects/12',
      });
   });

   it('adds the English version and passes the caller publish permission', async () => {
      const editor = contextWithGrants([projectsGrant(PermissionAction.create)]);

      await tool.execute(editor, {
         slug: 'a',
         cs: { title: 'A' },
         en: { title: 'A en' },
         status: EntityStatus.published,
      });

      const [dto, actor] = service.saveNew.mock.calls[0];
      expect(dto.translations.map(({ language }: { language: string }) => language)).toEqual([
         'cs',
         'en',
      ]);
      expect(actor).toEqual({ userId: 2, canPublish: false });
   });

   it('turns a taken slug into a readable error', async () => {
      service.saveNew.mockRejectedValue(new ConflictException('Slug already exists'));

      await expect(tool.execute(adminContext(), { slug: 'a', cs: { title: 'A' } })).rejects.toThrow(
         'Slug already exists',
      );
   });

   it('passes the years and ongoing to the save (false by default)', async () => {
      await tool.execute(adminContext(), {
         slug: 'nemocnice',
         cs: { title: 'Nemocnice' },
         startYear: 2023,
         ongoing: true,
      });
      await tool.execute(adminContext(), { slug: 'jina', cs: { title: 'Jina' } });

      expect(service.saveNew).toHaveBeenNthCalledWith(
         1,
         expect.objectContaining({ startYear: 2023, endYear: null, ongoing: true }),
         expect.anything(),
      );
      expect(service.saveNew).toHaveBeenNthCalledWith(
         2,
         expect.objectContaining({ ongoing: false }),
         expect.anything(),
      );
   });

   it('rewrites an inconsistent ongoing combination into a tool error', async () => {
      service.saveNew.mockRejectedValue(new BadRequestException('ongoing requires startYear'));

      await expect(
         tool.execute(adminContext(), {
            slug: 'nemocnice',
            cs: { title: 'Nemocnice' },
            ongoing: true,
         }),
      ).rejects.toThrow('ongoing requires startYear');
   });

   it('rejects an invalid slug in the schema', () => {
      expect(
         meta(CreateProjectTool).inputSchema.safeParse({ slug: 'Not A Slug', cs: { title: 'A' } })
            .success,
      ).toBe(false);
   });
});

describe('UpdateProjectTool showOnHomepage', () => {
   it('forwards the flag and answers with it', async () => {
      const service = {
         update: jest.fn().mockResolvedValue({ id: 1, showOnHomepage: true }),
      };

      const result = await new UpdateProjectTool(service as unknown as ProjectService).execute(
         adminContext(),
         { id: 1, showOnHomepage: true },
      );

      expect(service.update).toHaveBeenCalledWith(
         1,
         expect.objectContaining({ showOnHomepage: true }),
         expect.anything(),
      );
      expect(result).toMatchObject({ showOnHomepage: true });
   });
});

describe('SortProjectTagsTool', () => {
   it('needs projects.update and sorts through the service', async () => {
      const service = { sortTags: jest.fn().mockResolvedValue(undefined) };

      const result = await new SortProjectTagsTool(service as unknown as ProjectService).execute(
         adminContext(),
         { projectId: 3, tagIds: [2, 1] },
      );

      expect(meta(SortProjectTagsTool).permission).toEqual(projectsGrant(PermissionAction.update));
      expect(service.sortTags).toHaveBeenCalledWith(3, { tagIds: [2, 1] }, expect.anything());
      expect(result).toEqual({ projectId: 3, tagIds: [2, 1], reordered: true });
   });
});

describe('GetProjectPreviewUrlTool', () => {
   let service: { findOne: jest.Mock };
   let preview: { getPreviewUrl: jest.Mock };
   let tool: GetProjectPreviewUrlTool;

   beforeEach(() => {
      service = { findOne: jest.fn().mockResolvedValue({ id: 3, slug: 'x' }) };
      preview = { getPreviewUrl: jest.fn().mockReturnValue('https://web/api/draft?token=t') };
      tool = new GetProjectPreviewUrlTool(
         service as unknown as ProjectService,
         preview as unknown as PreviewService,
      );
   });

   it('is read-only with projects.read, like GET /projects/:id/preview-url', () => {
      expect(meta(GetProjectPreviewUrlTool)).toMatchObject({
         permission: projectsGrant(PermissionAction.read),
         behavior: 'readonly',
      });
   });

   it('signs the link through the same PreviewService, Czech by default', async () => {
      const result = await tool.execute(adminContext(), { id: 3 });

      expect(preview.getPreviewUrl).toHaveBeenCalledWith('projects', { id: 3, slug: 'x' }, 'cs');
      expect(result).toEqual({ previewUrl: 'https://web/api/draft?token=t', expiresInMinutes: 5 });
   });

   it('answers a missing project with a readable error', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(tool.execute(adminContext(), { id: 9, locale: 'en' })).rejects.toThrow(
         'Project with id 9 not found.',
      );
   });
});

describe('GenerateProjectTranslationTool', () => {
   let service: { findOne: jest.Mock; generateTranslation: jest.Mock };
   let tool: GenerateProjectTranslationTool;

   beforeEach(() => {
      service = {
         findOne: jest.fn().mockResolvedValue({
            translations: [
               {
                  language: 'cs',
                  title: 'Nemocnice',
                  description: 'Popis',
                  content: null,
                  metaTitle: null,
                  metaDescription: null,
               },
            ],
         }),
         generateTranslation: jest.fn().mockResolvedValue({ title: 'Hospital' }),
      };
      tool = new GenerateProjectTranslationTool(service as unknown as ProjectService);
   });

   it('asks for approval on every call (a paid model runs) and needs projects.update', () => {
      expect(meta(GenerateProjectTranslationTool)).toMatchObject({
         permission: projectsGrant(PermissionAction.update),
         behavior: 'mutating',
         needsApproval: true,
         audit: { action: 'project.generateTranslation' },
      });
   });

   it('translates the other language and saves nothing', async () => {
      const result = await tool.execute(adminContext(), { projectId: 4, targetLanguage: 'en' });

      expect(service.generateTranslation).toHaveBeenCalledTimes(1);
      expect(service.generateTranslation).toHaveBeenCalledWith(
         4,
         'en',
         {
            title: 'Nemocnice',
            description: 'Popis',
            content: null,
            metaTitle: null,
            metaDescription: null,
         },
         adminContext().user.id,
      );
      expect(result).toEqual({ projectId: 4, language: 'en', saved: false, title: 'Hospital' });
   });

   it('does not call the model without a source translation', async () => {
      await expect(
         tool.execute(adminContext(), { projectId: 4, targetLanguage: 'cs' }),
      ).rejects.toThrow('no English version');
      expect(service.generateTranslation).not.toHaveBeenCalled();
   });
});
